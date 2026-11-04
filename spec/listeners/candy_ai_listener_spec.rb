# frozen_string_literal: true

require 'rails_helper'

RSpec.describe CandyAIListener do
  subject(:listener) { described_class.instance }

  let(:config) do
    instance_double(CandyAI::Configuration, enabled: true)
  end
  let(:account) { create(:account, settings: { 'candy_ai' => { 'enabled' => true } }) }
  let(:inbox) { create(:inbox, account: account, candy_ai_settings: { 'enabled' => true, 'mode' => inbox_configuration['mode'] }) }
  let(:conversation) { create(:conversation, account: account, inbox: inbox) }
  let(:inbox_configuration) do
    {
      'enabled' => true,
      'mode' => 'autonomous'
    }
  end
  let(:message) do
    instance_double(
      Message,
      id: 42,
      incoming?: true,
      private?: false,
      content_for_llm: 'Hello',
      inbox: inbox,
      account: account,
      conversation: conversation
    )
  end
  let(:event) { instance_double(Events::Base, data: { message: message }) }

  before do
    allow(CandyAI).to receive(:config).and_return(config)
    allow(CandyAI::AccountConfiguration).to receive(:effective).with(inbox).and_return(inbox_configuration)
  end

  it 'queues an AI response for an enabled autonomous inbox' do
    expect(CandyAI::RespondToMessageJob).to receive(:perform_later).with(42)

    listener.message_created(event)
  end

  it 'queues an agent suggestion for an enabled assist inbox' do
    suggestion = instance_double(CandyAI::Suggestion, id: 91, status: 'pending')
    allow(CandyAI::AccountConfiguration).to receive(:effective).with(inbox).and_return(
      inbox_configuration.merge('mode' => 'assist')
    )
    expect(CandyAI::Suggestion).to receive(:request_for).with(message).and_return(suggestion)
    expect(CandyAI::GenerateSuggestionJob).to receive(:perform_later).with(91)

    listener.message_created(event)
  end

  it 'does not queue responses for a disabled inbox' do
    allow(CandyAI::AccountConfiguration).to receive(:effective).with(inbox).and_return(
      inbox_configuration.merge('enabled' => false)
    )

    expect(CandyAI::RespondToMessageJob).not_to receive(:perform_later)
    expect(CandyAI::GenerateSuggestionJob).not_to receive(:perform_later)

    listener.message_created(event)
  end

  it 'ignores private messages' do
    allow(message).to receive(:private?).and_return(true)

    expect(CandyAI::RespondToMessageJob).not_to receive(:perform_later)
    expect(CandyAI::GenerateSuggestionJob).not_to receive(:perform_later)

    listener.message_created(event)
  end

  it 'ignores outgoing messages' do
    allow(message).to receive(:incoming?).and_return(false)

    expect(CandyAI::RespondToMessageJob).not_to receive(:perform_later)
    expect(CandyAI::GenerateSuggestionJob).not_to receive(:perform_later)

    listener.message_created(event)
  end
end
