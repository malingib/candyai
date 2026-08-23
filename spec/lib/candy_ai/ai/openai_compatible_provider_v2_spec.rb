# frozen_string_literal: true

require 'rails_helper'

RSpec.describe CandyAI::AI::OpenAICompatibleProvider do
  subject(:provider) do
    described_class.new(
      api_key: 'test-key',
      base_url: 'https://example.test/v1',
      model: 'test-model'
    )
  end

  describe '#chat' do
    it 'normalizes an OpenAI-compatible response with full contract' do
      allow(provider).to receive(:request).and_return(
        {
          'id' => 'chatcmpl-test',
          'model' => 'test-model',
          'choices' => [{ 'message' => { 'content' => 'Hello from CandyAI.' }, 'finish_reason' => 'stop' }],
          'usage' => { 'prompt_tokens' => 5, 'completion_tokens' => 4, 'total_tokens' => 9 }
        }
      )

      result = provider.chat(messages: [{ role: 'user', content: 'Hello' }])

      expect(result.text).to eq('Hello from CandyAI.')
      expect(result.model).to eq('test-model')
      expect(result.provider).to eq(described_class.name)
      expect(result.usage).to include('total_tokens' => 9)
      expect(result.finish_reason).to eq('stop')
      expect(result.request_id).to eq('chatcmpl-test')
      expect(result.latency_ms).to be_a(Integer)
    end

    it 'falls back to a generated request id when none is supplied' do
      allow(provider).to receive(:request).and_return(
        {
          'model' => 'test-model',
          'choices' => [{ 'message' => { 'content' => 'Hi' } }]
        }
      )

      expect(provider.chat(messages: []).request_id).to be_present
    end

    it 'classifies upstream HTTP failures without exposing response bodies' do
      response = Struct.new(:code).new('429')
      allow(provider).to receive(:raise_error_for_status).and_call_original
      allow(provider).to receive(:request).and_raise(CandyAI::AI::RateLimitError, 'rate limited')

      expect { provider.chat(messages: []) }.to raise_error(CandyAI::AI::RateLimitError)
    end

    it 'reports availability based on model and endpoint' do
      expect(provider.available?).to be(true)

      missing = described_class.new(base_url: 'https://example.test/v1')
      expect(missing.available?).to be(false)
    end
  end
end
