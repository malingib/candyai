# frozen_string_literal: true

class CandyAI::ContextBuilder
  MAX_MESSAGES = 20
  MAX_MESSAGE_CHARACTERS = 4_000
  MAX_CONTEXT_CHARACTERS = 12_000

  def initialize(conversation, account:, inbox: nil)
    @conversation = conversation
    @account = account
    @inbox = inbox
    validate_scope!
  end

  def messages
    bounded_messages(recent_messages)
  end

  private

  def recent_messages
    @conversation.messages
                 .chat
                 .where(private: false)
                 .order(created_at: :desc)
                 .limit(MAX_MESSAGES)
                 .to_a
                 .reverse
  end

  def bounded_messages(messages)
    context = []
    characters = 0
    messages.each do |message|
      llm_message = llm_message(message)
      next if llm_message.blank?

      content = llm_message[:content]
      remaining = MAX_CONTEXT_CHARACTERS - characters
      break if remaining <= 0

      content = content.first([MAX_MESSAGE_CHARACTERS, remaining].min)
      next if content.blank?

      context << llm_message.merge(content: content)
      characters += content.length
    end
    context
  end

  def validate_scope!
    return if @conversation.account_id == @account.id && inbox_in_scope?

    raise ArgumentError, 'conversation does not belong to account'
  end

  def inbox_in_scope?
    return true unless @inbox

    @conversation.inbox_id == @inbox.id && @inbox.account_id == @account.id
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
