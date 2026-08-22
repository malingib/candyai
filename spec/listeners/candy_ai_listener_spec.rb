# frozen_string_literal: true

require 'rails_helper'

RSpec.describe CandyAIListener do
  subject(:listener) { described_class.instance }

  let(:config) do
    instance_double(CandyAI::Configuration, enabled: true)
  end
  let(:message) do
    instance_double(
      Message,
      id: 42,
      incoming?: true,
      private?: false,
      content_for_llm: 'Hello',
      inbox: inbox
    )
  end
  let(:inbox) { instance_double(Inbox) }
  let(:event) { instance_double(Events::Base, data: { message: message }) }

  before do
    allow(CandyAI).to receive(:config).and_return(config)
    allow(CandyAI::AccountConfiguration).to receive(:effective).with(inbox).and_return(inbox_configuration)
  end

  let(:inbox_configuration) do
    {
      'enabled' => true,
      'mode' => 'autonomous'
    }
  end

  it 'queues an AI response for an enabled autonomous inbox' do
    expect(CandyAI::RespondToMessageJob).to receive(:perform_later).with(42)

    listener.message_created(event)
  end

  it 'does not queue responses for assist mode' do
    allow(CandyAI::AccountConfiguration).to receive(:effective).with(inbox).and_return(
      inbox_configuration.merge('mode' => 'assist')
    )

    expect(CandyAI::RespondToMessageJob).not_to receive(:perform_later)

    listener.message_created(event)
  end

  it 'does not queue responses for a disabled inbox' do
    allow(CandyAI::AccountConfiguration).to receive(:effective).with(inbox).and_return(
      inbox_configuration.merge('enabled' => false)
    )

    expect(CandyAI::RespondToMessageJob).not_to receive(:perform_later)

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
