# frozen_string_literal: true

class CandyAI::ContextBuilder
  MAX_MESSAGES = 20
  MAX_MESSAGE_CHARACTERS = 4_000
  MAX_CONTEXT_CHARACTERS = 12_000
  MAX_CONTACT_FIELDS = 5
  MAX_INSTRUCTION_CHARACTERS = 4_000

  # Builds a structured, bounded context for the provider.
  #
  # The output is a stable JSON-shaped hash, not arbitrary text:
  #   system, account_instructions, inbox_instructions,
  #   conversation (bounded messages), contact (bounded), metadata.
  #
  # Only data actually required by the provider is included, and every
  # section is explicitly bounded so we never send unlimited history.
  def initialize(conversation, account:, inbox: nil,
                 account_instructions: nil, inbox_instructions: nil)
    @conversation = conversation
    @account = account
    @inbox = inbox
    @account_instructions = account_instructions
    @inbox_instructions = inbox_instructions
    validate_scope!
  end

  # Returns the full structured context hash.
  def build
    {
      system: system_instructions,
      account_instructions: bounded(@account_instructions),
      inbox_instructions: bounded(@inbox_instructions),
      conversation: conversation_messages,
      contact: contact_context,
      metadata: metadata
    }.compact
  end

  # Backward-compatible flat message array used by the autonomous path and
  # existing call sites. New code should prefer `#build`.
  def messages
    conversation_messages
  end

  private

  def system_instructions
    CandyAI::InstructionSystem.safety_rules
  end

  def bounded(instruction)
    return nil if instruction.blank?

    instruction.to_s.first(MAX_INSTRUCTION_CHARACTERS)
  end

  def conversation_messages
    bounded_messages(recent_messages)
  end

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

  def llm_message(message)
    content = message.content_for_llm
    return if content.blank?

    {
      role: message.incoming? ? 'user' : 'assistant',
      content: content.to_s,
      timestamp: message.try(:created_at)&.iso8601,
      metadata: message_metadata(message)
    }.compact
  end

  # Only surface metadata that is useful to the assistant and non-sensitive.
  def message_metadata(message)
    source = message.try(:source)
    return if source.blank?

    { source: source }
  end

  def contact_context
    contact = @conversation.try(:contact)
    return {} unless contact

    fields = {
      name: contact.try(:name),
      email: contact.try(:email),
      phone: contact.try(:phone_number),
      identifier: contact.try(:identifier),
      additional_attributes: safe_contact_attributes(contact)
    }.compact

    fields.first(MAX_CONTACT_FIELDS).to_h
  end

  def safe_contact_attributes(contact)
    attributes = contact.try(:additional_attributes)
    return nil if attributes.blank?

    # Strip anything that looks like a secret before sending to the provider.
    attributes.except(*%w[auth_token api_key secret webhook secret_key password token]).compact
  end

  def metadata
    {
      account_id: @account.id,
      inbox_id: @inbox&.id,
      conversation_id: @conversation.id,
      message_count: conversation_messages.length
    }.compact
  end

  def validate_scope!
    return if @conversation.account_id == @account.id && inbox_in_scope?

    raise ArgumentError, 'conversation does not belong to account'
  end

  def inbox_in_scope?
    return true unless @inbox

    @conversation.inbox_id == @inbox.id && @inbox.account_id == @account.id
  end
end
