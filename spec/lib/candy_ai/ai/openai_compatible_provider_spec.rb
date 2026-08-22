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
    it 'normalizes an OpenAI-compatible response' do
      allow(provider).to receive(:request).and_return(
        {
          'id' => 'chatcmpl-test',
          'model' => 'test-model',
          'choices' => [{ 'message' => { 'content' => 'Hello from CandyAI.' } }],
          'usage' => { 'prompt_tokens' => 5, 'completion_tokens' => 4 }
        }
      )

      result = provider.chat(messages: [{ role: 'user', content: 'Hello' }])

      expect(result.text).to eq('Hello from CandyAI.')
      expect(result.model).to eq('test-model')
      expect(result.provider).to eq(described_class.name)
      expect(result.usage).to include('prompt_tokens' => 5)
    end

    it 'rejects an invalid messages value' do
      expect { provider.chat(messages: nil) }
        .to raise_error(ArgumentError, 'messages must be an Array')
    end

    it 'rejects a missing model before making a request' do
      provider = described_class.new(api_key: 'test-key', base_url: 'https://example.test/v1')

      expect { provider.chat(messages: []) }
        .to raise_error(CandyAI::AI::ConfigurationError, 'AI provider model is not configured')
    end

    it 'rejects missing credentials for the hosted OpenAI endpoint' do
      provider = described_class.new(model: 'test-model')

      expect { provider.chat(messages: []) }
        .to raise_error(CandyAI::AI::ConfigurationError, 'AI provider API credentials are not configured')
    end

    it 'rejects insecure custom endpoints unless explicitly enabled' do
      expect do
        described_class.new(
          api_key: 'test-key',
          base_url: 'http://localhost/v1',
          model: 'test-model'
        )
      end.to raise_error(CandyAI::AI::ConfigurationError, 'AI provider endpoint must be an HTTPS URL')
    end

    it 'classifies upstream HTTP failures without exposing response bodies' do
      response = Struct.new(:code).new('401')
      provider = described_class.new(api_key: 'test-key', model: 'test-model')

      expect { provider.send(:raise_error_for_status, response) }
        .to raise_error(CandyAI::AI::AuthenticationError, 'AI provider request failed (401)')
    end
  end
end
