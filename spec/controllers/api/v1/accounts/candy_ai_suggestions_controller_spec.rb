# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'CandyAI suggestions API', type: :request do
  let(:account) { create(:account, settings: { 'candy_ai' => { 'enabled' => true } }) }
  let(:other_account) { create(:account) }
  let(:inbox) { create(:inbox, account: account, candy_ai_settings: { 'enabled' => true, 'mode' => 'assist' }) }
  let(:conversation) { create(:conversation, account: account, inbox: inbox) }
  let(:message) { create(:message, account: account, inbox: inbox, conversation: conversation) }
  let(:agent) { create(:user, account: account, role: :agent) }

  it 'requires authentication' do
    get "/api/v1/accounts/#{account.id}/candy_ai_suggestions", params: { conversation_id: conversation.id }

    expect(response).to have_http_status(:unauthorized)
  end

  it 'creates a scoped pending suggestion and enqueues only the suggestion job' do
    expect do
      post "/api/v1/accounts/#{account.id}/candy_ai_suggestions",
           params: { conversation_id: conversation.id, message_id: message.id },
           headers: agent.create_new_auth_token,
           as: :json
    end.to have_enqueued_job(CandyAI::GenerateSuggestionJob)

    expect(response).to have_http_status(:accepted)
    expect(response.parsed_body.dig('suggestion', 'status')).to eq('pending')
    expect(CandyAI::Suggestion.last.account_id).to eq(account.id)
  end

  it 'cannot access a suggestion through another account' do
    suggestion = CandyAI::Suggestion.create!(
      account: account,
      inbox: inbox,
      conversation: conversation,
      message: message,
      source: 'manual',
      status: 'generated',
      content: 'Scoped response'
    )
    other_agent = create(:user, account: other_account, role: :agent)

    get "/api/v1/accounts/#{other_account.id}/candy_ai_suggestions/#{suggestion.id}",
        headers: other_agent.create_new_auth_token,
        as: :json

    expect(response).to have_http_status(:not_found)
  end

  it 'accepts edited content without creating an outgoing Chatwoot message' do
    suggestion = CandyAI::Suggestion.create!(
      account: account,
      inbox: inbox,
      conversation: conversation,
      message: message,
      source: 'manual',
      status: 'generated',
      content: 'Original response'
    )

    expect do
      patch "/api/v1/accounts/#{account.id}/candy_ai_suggestions/#{suggestion.id}",
            params: { status: 'accepted', content: 'Edited response' },
            headers: agent.create_new_auth_token,
            as: :json
    end.not_to change(Message, :count)

    expect(response).to have_http_status(:success)
    expect(suggestion.reload).to have_attributes(status: 'accepted', content: 'Edited response')
  end
end
