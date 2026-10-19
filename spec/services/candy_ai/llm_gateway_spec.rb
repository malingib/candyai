# frozen_string_literal: true

require 'rails_helper'

RSpec.describe CandyAI::LlmGateway do
  describe '.complete' do
    let(:router) { CandyAI::AI.router }
    let(:response) { CandyAI::AI::Response.new(text: 'A grounded answer.', model: 'test-model') }

    it 'uses the configured provider and passes model controls through' do
      allow(router).to receive(:chat).and_return(response)

      result = described_class.complete(
        provider: 'openai',
        model: 'test-model',
        prompt: 'How do refunds work?',
        temperature: 0.3,
        max_tokens: 350
      )

      expect(result).to eq('A grounded answer.')
      expect(router).to have_received(:chat).with(
        provider: 'openai',
        model: 'test-model',
        messages: [{ role: 'user', content: 'How do refunds work?' }],
        temperature: 0.3,
        max_tokens: 350
      )
    end

    it 'does not call the provider for an empty prompt' do
      expect(router).not_to receive(:chat)

      result = described_class.complete(
        provider: 'openai',
        model: 'test-model',
        prompt: '  ',
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
        prompt: 'hello',
        temperature: 0.3,
        max_tokens: 350
      )

      expect(result).to be_nil
    end
  end
end
