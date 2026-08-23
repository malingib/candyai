# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'CandyAI tenant isolation and security', type: :request do
  let(:account) { create(:account, settings: { 'candy_ai' => { 'enabled' => true } }) }
  let(:other_account) { create(:account) }
  let(:inbox) { create(:inbox, account: account, candy_ai_settings: { 'enabled' => true, 'mode' => 'assist' }) }
  let(:other_inbox) { create(:inbox, account: other_account, candy_ai_settings: { 'enabled' => true, 'mode' => 'assist' }) }
  let(:conversation) { create(:conversation, account: account, inbox: inbox) }
  let(:message) { create(:message, account: account, inbox: inbox, conversation: conversation) }
  let(:agent) { create(:user, account: account, role: :agent) }
  let(:other_agent) { create(:user, account: other_account, role: :agent) }

  it 'prevents cross-account access to a suggestion' do
    suggestion = CandyAI::Suggestion.create!(
      account: account, inbox: inbox, conversation: conversation, message: message,
      source: 'manual', status: 'generated', content: 'Scoped'
    )

    get "/api/v1/accounts/#{other_account.id}/candy_ai_suggestions/#{suggestion.id}",
        headers: other_agent.create_new_auth_token, as: :json

    expect(response).to have_http_status(:not_found)
  end

  it 'prevents cross-inbox configuration access' do
    get "/api/v1/accounts/#{account.id}/candy_ai_inboxes/#{other_inbox.id}",
        headers: agent.create_new_auth_token, as: :json

    expect(response).to have_http_status(:not_found)
  end

  it 'never exposes provider API keys in the configuration API' do
    account.update!(settings: { 'candy_ai' => { 'enabled' => true } })

    get "/api/v1/accounts/#{account.id}/candy_ai",
        headers: agent.create_new_auth_token, as: :json

    expect(response.parsed_body.to_s).not_to match(/sk-[a-zA-Z0-9]{20,}/)
    expect(response.parsed_body.to_s).not_to include('Bearer')
  end

  it 'does not send autonomously from the assist suggestions endpoint' do
    suggestion = CandyAI::Suggestion.create!(
      account: account, inbox: inbox, conversation: conversation, message: message,
      source: 'manual', status: 'generated', content: 'Draft reply'
    )

    expect do
      patch "/api/v1/accounts/#{account.id}/candy_ai_suggestions/#{suggestion.id}",
            params: { status: 'accepted', content: 'Draft reply' },
            headers: agent.create_new_auth_token, as: :json
    end.not_to change(Message, :count)

    expect(response).to have_http_status(:success)
  end

  it 'refuses assist generation for autonomous inboxes' do
    autonomous_inbox = create(:inbox, account: account, candy_ai_settings: { 'enabled' => true, 'mode' => 'autonomous' })
    autonomous_conversation = create(:conversation, account: account, inbox: autonomous_inbox)
    autonomous_message = create(:message, account: account, inbox: autonomous_inbox, conversation: autonomous_conversation)

    post "/api/v1/accounts/#{account.id}/candy_ai_suggestions",
         params: { conversation_id: autonomous_conversation.id, message_id: autonomous_message.id },
         headers: agent.create_new_auth_token, as: :json

    expect(response).to have_http_status(:unprocessable_entity)
  end
end
