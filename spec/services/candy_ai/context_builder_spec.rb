# frozen_string_literal: true

require 'rails_helper'

RSpec.describe CandyAI::ContextBuilder do
  let(:account) { instance_double(Account, id: 10) }
  let(:conversation) { instance_double(Conversation, account_id: 10) }
  let(:scope) { instance_double(ActiveRecord::Relation) }

  before do
    allow(conversation).to receive(:messages).and_return(scope)
    allow(scope).to receive(:chat).and_return(scope)
    allow(scope).to receive(:where).with(private: false).and_return(scope)
    allow(scope).to receive(:order).with(created_at: :desc).and_return(scope)
    allow(scope).to receive(:limit).with(described_class::MAX_MESSAGES).and_return(scope)
  end

  it 'returns bounded, chronological LLM messages' do
    message = instance_double(Message, content_for_llm: 'Hello', incoming?: true)
    allow(scope).to receive(:to_a).and_return([message])

    expect(described_class.new(conversation, account: account).messages).to eq(
      [{ role: 'user', content: 'Hello' }]
    )
  end

  it 'omits messages without LLM content' do
    message = instance_double(Message, content_for_llm: nil, incoming?: true)
    allow(scope).to receive(:to_a).and_return([message])

    expect(described_class.new(conversation, account: account).messages).to be_empty
  end

  it 'rejects a conversation from another account' do
    foreign_conversation = instance_double(Conversation, account_id: 20)

    expect { described_class.new(foreign_conversation, account: account) }
      .to raise_error(ArgumentError, 'conversation does not belong to account')
  end
end
