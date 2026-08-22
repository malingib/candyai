# frozen_string_literal: true

require 'rails_helper'

RSpec.describe CandyAI::GenerateSuggestionJob do
  let(:account) { create(:account, settings: { 'candy_ai' => { 'enabled' => true } }) }
  let(:inbox) { create(:inbox, account: account, candy_ai_settings: { 'enabled' => true, 'mode' => 'assist' }) }
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
    allow(CandyAI::AI).to receive(:orchestrator).and_return(instance_double(CandyAI::AI::Orchestrator, respond: response))
    allow(CandyAI).to receive(:config).and_return(
      instance_double(CandyAI::Configuration, enabled: true, default_ai_provider: 'test-provider')
    )
  end

  it 'persists a generated suggestion without sending a Chatwoot message' do
    expect(Messages::MessageBuilder).not_to receive(:new)

    described_class.perform_now(suggestion.id)

    expect(suggestion.reload).to have_attributes(
      status: 'generated',
      content: 'You can reset it from the account settings.',
      provider: 'test-provider',
      model: 'test-model'
    )
  end

  it 'records provider failures without raising to the job queue' do
    orchestrator = instance_double(CandyAI::AI::Orchestrator)
    allow(orchestrator).to receive(:respond).and_raise(CandyAI::AI::TimeoutError, 'timed out')
    allow(CandyAI::AI).to receive(:orchestrator).and_return(orchestrator)

    expect { described_class.perform_now(suggestion.id) }.not_to raise_error

    expect(suggestion.reload).to have_attributes(status: 'failed', failure_category: 'timeout')
    expect(suggestion.error_message).to eq('timed out')
  end

  it 'does not process a suggestion whose relationships were tampered with' do
    other_account = create(:account)
    suggestion.update!(account: other_account)

    expect { described_class.perform_now(suggestion.id) }.not_to raise_error
    expect(suggestion.reload.status).to eq('pending')
  end
end
