# frozen_string_literal: true

class CandyAI::ContextBuilder
  MAX_MESSAGES = 20

  def initialize(conversation, account:)
    @conversation = conversation
    @account = account
    validate_scope!
  end

  def messages
    @conversation.messages
                 .chat
                 .where(private: false)
                 .order(created_at: :desc)
                 .limit(MAX_MESSAGES)
                 .to_a
                 .reverse
                 .filter_map { |message| llm_message(message) }
  end

  private

  def validate_scope!
    return if @conversation.account_id == @account.id

    raise ArgumentError, 'conversation does not belong to account'
  end

  def llm_message(message)
    content = message.content_for_llm
    return if content.blank?

    {
      role: message.incoming? ? 'user' : 'assistant',
      content: content.to_s
    }
  end
end
