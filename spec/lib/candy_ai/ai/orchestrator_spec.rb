# frozen_string_literal: true

require 'rails_helper'

RSpec.describe CandyAI::AI::Orchestrator do
  let(:router) { instance_double(CandyAI::AI::Router) }
  let(:orchestrator) { described_class.new(router: router) }
  let(:response) { instance_double(CandyAI::AI::Response) }

  it 'adds the system prompt before conversation messages' do
    messages = [{ role: 'user', content: 'How can I reset my password?' }]

    expect(router).to receive(:chat).with(
      messages: [
        { role: 'system', content: described_class::DEFAULT_SYSTEM_PROMPT },
        *messages
      ],
      provider: 'openai',
      model: 'test-model'
    ).and_return(response)

    expect(
      orchestrator.respond(messages: messages, provider: 'openai', model: 'test-model')
    ).to eq(response)
  end

  it 'rejects a non-array message collection' do
    expect { orchestrator.respond(messages: nil) }
      .to raise_error(ArgumentError, 'messages must be an Array')
  end
end
