# frozen_string_literal: true

require 'rails_helper'

RSpec.describe CandyAI::GenerateSuggestionJob do
  let(:account) { create(:account, settings: { 'candy_ai' => { 'enabled' => true, 'system_prompt' => 'Account policy' } }) }
  let(:inbox) do
    create(:inbox, account: account,
                   candy_ai_settings: { 'enabled' => true, 'mode' => 'assist', 'system_prompt' => 'Inbox policy' })
  end
  let(:conversation) { create(:conversation, account: account, inbox: inbox) }
  let(:message) { create(:message, account: account, inbox: inbox, conversation: conversation, content: 'How do I reset my password?') }
  let(:suggestion) { CandyAI::Suggestion.request_for(message, source: 'manual') }
  let(:response) do
    CandyAI::AI::Response.new(
      text: 'You can reset it from the account settings.',
      provider: 'test-provider',
      model: 'test-model',
      usage: { 'total_tokens' => 12 }
    )
  end

  before do
    allow(CandyAI::AI).to receive(:router).and_return(instance_double(CandyAI::AI::Router, chat: response))
    allow(CandyAI).to receive(:config).and_return(
      instance_double(CandyAI::Configuration, enabled?: true, default_ai_provider: 'test-provider')
    )
  end

  it 'persists a generated suggestion without sending a Chatwoot message' do
    expect(Messages::MessageBuilder).not_to receive(:new)

    described_class.perform_now(suggestion.id)

    expect(suggestion.reload).to have_attributes(
      status: 'generated',
      content: 'You can reset it from the account settings.',
      provider: 'test-provider',
      model: 'test-model',
      quality_status: 'pass'
    )
    expect(suggestion.intelligence).to include('intent' => 'account_access')
  end

  it 'passes account and inbox instructions as separate prompt layers' do
    router = instance_double(CandyAI::AI::Router, chat: response)
    expect(router).to receive(:chat) do |**kwargs|
      expect(kwargs[:system]).to include('Account guidance:\nAccount policy')
      expect(kwargs[:system]).to include('Inbox guidance:\nInbox policy')
      response
    end
    allow(CandyAI::AI).to receive(:router).and_return(router)

    described_class.perform_now(suggestion.id)
  end

  it 'records a usage record on success' do
    expect { described_class.perform_now(suggestion.id) }
      .to change(CandyAI::UsageRecord, :count).by(1)

    expect(CandyAI::UsageRecord.last).to have_attributes(
      account: account,
      success: true,
      provider: 'test-provider'
    )
  end

  it 'records provider failures without raising to the job queue' do
    router = instance_double(CandyAI::AI::Router)
    allow(router).to receive(:chat).and_raise(CandyAI::AI::TimeoutError, 'timed out')
    allow(CandyAI::AI).to receive(:router).and_return(router)

    expect { described_class.perform_now(suggestion.id) }.not_to raise_error

    expect(suggestion.reload).to have_attributes(status: 'failed', failure_category: 'timeout')
    expect(CandyAI::UsageRecord.last).to have_attributes(success: false, error_category: 'timeout')
  end

  it 'rejects a low-quality response' do
    allow(CandyAI::AI).to receive(:router).and_return(
      instance_double(CandyAI::AI::Router, chat: CandyAI::AI::Response.new(text: ''))
    )

    expect { described_class.perform_now(suggestion.id) }.not_to raise_error

    expect(suggestion.reload).to have_attributes(status: 'failed', failure_category: 'quality')
  end

  it 'does not process a suggestion whose relationships were tampered with' do
    other_account = create(:account)
    suggestion.update!(account: other_account)

    expect { described_class.perform_now(suggestion.id) }.not_to raise_error
    expect(suggestion.reload.status).to eq('pending')
  end
end
