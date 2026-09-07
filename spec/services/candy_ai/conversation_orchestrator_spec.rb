# frozen_string_literal: true

require 'rails_helper'

RSpec.describe CandyAI::ConversationOrchestrator do
  let(:account) { create(:account, settings: { 'candy_ai' => { 'enabled' => true, 'provider' => 'openai', 'model' => 'test' } }) }
  let(:inbox) { create(:inbox, account: account, candy_ai_settings: { 'enabled' => true, 'mode' => 'autonomous' }) }
  let(:conversation) { create(:conversation, account: account, inbox: inbox) }
  let(:message) { create(:message, conversation: conversation, account: account, message_type: :incoming, content: 'I need a human agent') }

  it 'hands off when the customer explicitly requests a human' do
    result = described_class.process(conversation: conversation, message: message)

    expect(result.status).to eq(:handoff)
    expect(result.reason).to eq('customer_requested_human')
  end
end
