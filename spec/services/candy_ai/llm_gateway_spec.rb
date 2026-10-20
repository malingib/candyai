# frozen_string_literal: true

require 'rails_helper'

RSpec.describe CandyAI::LlmGateway do
  describe '.complete' do
    let(:router) { CandyAI::AI.router }
    let(:response) { CandyAI::AI::Response.new(text: 'A grounded answer.', model: 'test-model') }
    let(:messages) do
      [
        { role: 'system', content: 'Use the provided policy and do not invent facts.' },
        { role: 'user', content: 'How do refunds work?' }
      ]
    end

    it 'uses the configured provider and preserves message roles and model controls' do
      allow(router).to receive(:chat).and_return(response)

      result = described_class.complete(
        provider: 'openai',
        model: 'test-model',
        messages: messages,
        temperature: 0.3,
        max_tokens: 350
      )

      expect(result).to eq('A grounded answer.')
      expect(router).to have_received(:chat).with(
        provider: 'openai',
        model: 'test-model',
        messages: messages,
        temperature: 0.3,
        max_tokens: 350
      )
    end

    it 'does not call the provider when all message content is blank' do
      expect(router).not_to receive(:chat)

      result = described_class.complete(
        provider: 'openai',
        model: 'test-model',
        messages: [{ role: 'user', content: '  ' }],
        temperature: 0.3,
        max_tokens: 350
      )

      expect(result).to be_nil
    end

    it 'fails closed when the provider raises' do
      allow(router).to receive(:chat).and_raise(Timeout::Error)

      result = described_class.complete(
        provider: 'openai',
        model: 'test-model',
        messages: [{ role: 'user', content: 'hello' }],
        temperature: 0.3,
        max_tokens: 350
      )

      expect(result).to be_nil
    end
  end
end
