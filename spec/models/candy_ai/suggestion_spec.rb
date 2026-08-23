# frozen_string_literal: true

require 'rails_helper'

RSpec.describe CandyAI::Suggestion do
  let(:account) { create(:account) }
  let(:inbox) { create(:inbox, account: account) }
  let(:conversation) { create(:conversation, account: account, inbox: inbox) }
  let(:message) { create(:message, account: account, inbox: inbox, conversation: conversation) }

  it 'creates one active pending suggestion per source message' do
    first = described_class.request_for(message)
    second = described_class.request_for(message)

    expect(second.id).to eq(first.id)
    expect(described_class.active.where(message_id: message.id).count).to eq(1)
  end

  it 'returns the concurrently-created active suggestion when creation races' do
    winner = described_class.create!(account: account, inbox: inbox, conversation: conversation, message: message,
                                     source: 'message_created', status: 'pending')
    allow(described_class.active).to receive(:find_or_create_by!).and_raise(ActiveRecord::RecordNotUnique)
    allow(described_class.active).to receive(:find_by!).with(message_id: message.id).and_return(winner)

    result = described_class.request_for(message)

    expect(result.id).to eq(winner.id)
  end

  it 'allows a new request after the active suggestion is terminal' do
    first = described_class.request_for(message)
    first.update!(status: 'rejected')

    second = described_class.request_for(message, source: 'regenerate')

    expect(second.id).not_to eq(first.id)
    expect(second.source).to eq('regenerate')
  end

  it 'validates generated content but permits pending suggestions without content' do
    expect(described_class.new(account: account, inbox: inbox, conversation: conversation, message: message,
                               source: 'manual', status: 'pending')).to be_valid

    expect(described_class.new(account: account, inbox: inbox, conversation: conversation, message: message,
                               source: 'manual', status: 'generated')).not_to be_valid
  end
end
