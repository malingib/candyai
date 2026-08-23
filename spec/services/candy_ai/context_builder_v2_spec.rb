# frozen_string_literal: true

require 'rails_helper'

RSpec.describe CandyAI::ContextBuilder do
  let(:account) { create(:account) }
  let(:inbox) { create(:inbox, account: account) }
  let(:conversation) { create(:conversation, account: account, inbox: inbox) }

  describe '#build' do
    it 'returns a structured context hash' do
      create(:message, account: account, inbox: inbox, conversation: conversation,
                        content: 'How do I reset my password?', message_type: 'incoming')

      context = described_class.new(conversation, account: account, inbox: inbox).build

      expect(context).to include(:system, :conversation, :metadata)
      expect(context[:system]).to include('CandyAI')
      expect(context[:conversation]).to be_an(Array)
      expect(context[:metadata]).to include(account_id: account.id, inbox_id: inbox.id)
    end

    it 'isolates conversations to the owning account' do
      foreign = create(:account)
      foreign_conversation = create(:conversation, account: foreign)

      expect { described_class.new(foreign_conversation, account: account) }
        .to raise_error(ArgumentError, 'conversation does not belong to account')
    end

    it 'isolates conversations to the owning inbox' do
      other_inbox = create(:inbox, account: account)
      expect { described_class.new(conversation, account: account, inbox: other_inbox) }
        .to raise_error(ArgumentError, 'conversation does not belong to account')
    end

    it 'bounds the number of messages' do
      stub_const("#{described_class}::MAX_MESSAGES", 3)
      create_list(:message, 10, account: account, inbox: inbox, conversation: conversation,
                                content: 'message', message_type: 'incoming')

      context = described_class.new(conversation, account: account, inbox: inbox).build

      expect(context[:conversation].length).to eq(3)
    end

    it 'bounds total context characters' do
      stub_const("#{described_class}::MAX_CONTEXT_CHARACTERS", 100)
      create(:message, account: account, inbox: inbox, conversation: conversation,
                        content: 'x' * 1000, message_type: 'incoming')

      context = described_class.new(conversation, account: account, inbox: inbox).build

      total = context[:conversation].sum { |m| m[:content].length }
      expect(total).to be <= 100
    end

    it 'bounds instruction size' do
      stub_const("#{described_class}::MAX_INSTRUCTION_CHARACTERS", 10)
      create(:message, account: account, inbox: inbox, conversation: conversation,
                        content: 'hi', message_type: 'incoming')

      context = described_class.new(conversation, account: account, inbox: inbox,
                                    account_instructions: 'a' * 100).build

      expect(context[:account_instructions].length).to eq(10)
    end

    it 'excludes sensitive contact attributes' do
      contact = conversation.contact
      contact.update!(
        additional_attributes: {
          'email' => 'a@b.com',
          'auth_token' => 'secret-token',
          'api_key' => 'secret-key'
        }
      )

      context = described_class.new(conversation, account: account, inbox: inbox).build

      attributes = context[:contact][:additional_attributes]
      expect(attributes).not_to have_key('auth_token')
      expect(attributes).not_to have_key('api_key')
    end

    it 'excludes private messages' do
      create(:message, account: account, inbox: inbox, conversation: conversation,
                        content: 'private note', private: true, message_type: 'outgoing')
      create(:message, account: account, inbox: inbox, conversation: conversation,
                        content: 'public message', message_type: 'incoming')

      context = described_class.new(conversation, account: account, inbox: inbox).build

      contents = context[:conversation].map { |m| m[:content] }
      expect(contents).not_to include('private note')
      expect(contents).to include('public message')
    end
  end
end
