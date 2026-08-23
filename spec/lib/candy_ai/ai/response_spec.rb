# frozen_string_literal: true

require 'rails_helper'

RSpec.describe CandyAI::AI::Response do
  it 'exposes the normalized contract fields' do
    response = described_class.new(
      text: 'Hello',
      model: 'test-model',
      provider: 'openai',
      usage: { 'total_tokens' => 5 },
      finish_reason: 'stop',
      request_id: 'req-1',
      latency_ms: 123,
      metadata: { base_url: 'https://x.test' }
    )

    expect(response.text).to eq('Hello')
    expect(response.provider).to eq('openai')
    expect(response.model).to eq('test-model')
    expect(response.usage).to include('total_tokens' => 5)
    expect(response.finish_reason).to eq('stop')
    expect(response.request_id).to eq('req-1')
    expect(response.latency_ms).to eq(123)
    expect(response.metadata).to include(:base_url)
  end

  it 'reports success based on presence of text' do
    expect(described_class.new(text: 'x')).to be_success
    expect(described_class.new(text: '')).not_to be_success
  end
end
