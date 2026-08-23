# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'CandyAI suggestion lifecycle', type: :request do
  let(:account) { create(:account, settings: { 'candy_ai' => { 'enabled' => true } }) }
  let(:inbox) { create(:inbox, account: account, candy_ai_settings: { 'enabled' => true, 'mode' => 'assist' }) }
  let(:conversation) { create(:conversation, account: account, inbox: inbox) }
  let(:message) { create(:message, account: account, inbox: inbox, conversation: conversation, content: 'How do I reset?') }
  let(:agent) { create(:user, account: account, role: :agent) }
  let(:ai_response) do
    CandyAI::AI::Response.new(text: 'Reset via settings.', provider: 'p', model: 'm', usage: { 'total_tokens' => 4 })
  end

  before do
    allow(CandyAI::AI).to receive(:router).and_return(instance_double(CandyAI::AI::Router, chat: ai_response))
    allow(CandyAI).to receive(:config).and_return(
      instance_double(CandyAI::Configuration, enabled?: true, default_ai_provider: 'p')
    )
  end

  it 'returns a valid generated suggestion with intelligence and quality status' do
    post "/api/v1/accounts/#{account.id}/candy_ai_suggestions",
         params: { conversation_id: conversation.id, message_id: message.id },
         headers: agent.create_new_auth_token, as: :json

    expect(response).to have_http_status(:accepted)
    perform_enqueued_jobs

    suggestion = CandyAI::Suggestion.last
    expect(suggestion).to have_attributes(status: 'generated', quality_status: 'pass')
    expect(suggestion.intelligence).to include('intent' => 'account_access')
    expect(suggestion.content).to eq('Reset via settings.')
  end

  it 'regenerates a new suggestion for an existing generated one' do
    existing = CandyAI::Suggestion.create!(
      account: account, inbox: inbox, conversation: conversation, message: message,
      source: 'manual', status: 'generated', content: 'Old'
    )

    post "/api/v1/accounts/#{account.id}/candy_ai_suggestions/#{existing.id}/regenerate",
         params: { conversation_id: conversation.id },
         headers: agent.create_new_auth_token, as: :json

    expect(response).to have_http_status(:accepted)
    perform_enqueued_jobs

    expect(CandyAI::Suggestion.where(conversation_id: conversation.id).count).to eq(2)
    expect(existing.reload.status).to eq('expired')
  end

  it 'rejects an empty provider response as a quality failure' do
    allow(CandyAI::AI).to receive(:router).and_return(
      instance_double(CandyAI::AI::Router, chat: CandyAI::AI::Response.new(text: ''))
    )

    post "/api/v1/accounts/#{account.id}/candy_ai_suggestions",
         params: { conversation_id: conversation.id, message_id: message.id },
         headers: agent.create_new_auth_token, as: :json
    perform_enqueued_jobs

    expect(CandyAI::Suggestion.last).to have_attributes(status: 'failed', failure_category: 'quality')
  end

  it 'records provider failure without creating an outgoing message' do
    router = instance_double(CandyAI::AI::Router)
    allow(router).to receive(:chat).and_raise(CandyAI::AI::UnavailableError, 'down')
    allow(CandyAI::AI).to receive(:router).and_return(router)

    post "/api/v1/accounts/#{account.id}/candy_ai_suggestions",
         params: { conversation_id: conversation.id, message_id: message.id },
         headers: agent.create_new_auth_token, as: :json
    expect { perform_enqueued_jobs }.not_to raise_error

    expect(CandyAI::Suggestion.last).to have_attributes(status: 'failed', failure_category: 'unavailable')
    expect(Message.count).to eq(1)
  end
end
