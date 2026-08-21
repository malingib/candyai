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
  end
end
