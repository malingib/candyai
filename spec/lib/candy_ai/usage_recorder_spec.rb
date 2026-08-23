# frozen_string_literal: true

require 'rails_helper'

RSpec.describe CandyAI::UsageRecorder do
  let(:account) { create(:account) }
  let(:inbox) { create(:inbox, account: account) }
  let(:conversation) { create(:conversation, account: account, inbox: inbox) }
  let(:response) do
    CandyAI::AI::Response.new(
      text: 'hi', provider: 'openai', model: 'gpt', usage: { 'prompt_tokens' => 3, 'completion_tokens' => 2, 'total_tokens' => 5 }
    )
  end

  it 'records a successful request with token capture' do
    record = described_class.record!(
      account: account, inbox: inbox, conversation: conversation,
      provider: 'openai', model: 'gpt', request_id: 'r1',
      started_at: Time.current, success: true, response: response
    )

    expect(record).to have_attributes(
      account: account, success: true, provider: 'openai', model: 'gpt',
      input_tokens: 3, output_tokens: 2, total_tokens: 5
    )
  end

  it 'records a failed request with an error category' do
    record = described_class.record!(
      account: account, inbox: inbox, conversation: conversation,
      provider: 'openai', model: 'gpt', request_id: 'r2',
      started_at: Time.current, success: false, response: nil, error_category: 'timeout'
    )

    expect(record).to have_attributes(success: false, error_category: 'timeout')
  end

  it 'scopes usage records by tenant (no cross-account leakage)' do
    other = create(:account)
    described_class.record!(
      account: account, inbox: inbox, conversation: conversation,
      provider: 'openai', model: 'gpt', request_id: 'r3',
      started_at: Time.current, success: true, response: response
    )

    expect(CandyAI::UsageRecord.for_account(other).count).to eq(0)
    expect(CandyAI::UsageRecord.for_account(account).count).to eq(1)
  end
end
