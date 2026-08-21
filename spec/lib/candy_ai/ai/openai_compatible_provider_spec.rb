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
      response = instance_double(Net::HTTPResponse, body: {
        'id' => 'chatcmpl-test',
        'model' => 'test-model',
        'choices' => [{ 'message' => { 'content' => 'Hello from CandyAI.' } }],
        'usage' => { 'prompt_tokens' => 5, 'completion_tokens' => 4 }
      }.to_json)
      allow(response).to receive(:is_a?).with(Net::HTTPSuccess).and_return(true)
      allow(response).to receive(:message).and_return('OK')
      allow(Net::HTTP).to receive(:new).and_return(instance_double(Net::HTTP, use_ssl=: nil, open_timeout=: nil, read_timeout=: nil, request: response))

      result = provider.chat(messages: [{ role: 'user', content: 'Hello' }])

      expect(result.text).to eq('Hello from CandyAI.')
      expect(result.model).to eq('test-model')
      expect(result.usage).to include('prompt_tokens' => 5)
    end
  end
end
