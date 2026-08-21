# frozen_string_literal: true

require 'rails_helper'

RSpec.describe CandyAIListener do
  subject(:listener) { described_class.instance }

  let(:config) do
    instance_double(
      CandyAI::Configuration,
      enabled: true,
      default_ai_provider: 'openai'
    )
  end
  let(:message) do
    instance_double(
      Message,
      id: 42,
      incoming?: true,
      private?: false,
      content_for_llm: 'Hello'
    )
  end
  let(:account) { instance_double(Account) }
  let(:event) { instance_double(Events::Base, data: { message: message }) }

  before do
    allow(CandyAI).to receive(:config).and_return(config)
    allow(ENV).to receive(:[]).and_call_original
    allow(ENV).to receive(:[]).with('CANDYAI_AGENT_BOT_ID').and_return('123')
  end

  it 'queues an AI response for an eligible incoming message' do
    allow(message).to receive(:account).and_return(account)

    expect(CandyAI::RespondToMessageJob).to receive(:perform_later).with(42)

    listener.message_created(event)
  end

  it 'ignores private messages' do
    allow(message).to receive(:private?).and_return(true)

    expect(CandyAI::RespondToMessageJob).not_to receive(:perform_later)

    listener.message_created(event)
  end

  it 'ignores outgoing messages' do
    allow(message).to receive(:incoming?).and_return(false)

    expect(CandyAI::RespondToMessageJob).not_to receive(:perform_later)

    listener.message_created(event)
  end
end
