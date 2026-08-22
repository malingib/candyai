# frozen_string_literal: true

class CandyAI::RespondToMessageJob < ApplicationJob
  queue_as :default

  def perform(message_id)
    return unless CandyAI.config.enabled

    message = Message.includes(:conversation, :account, :inbox).find_by(id: message_id)
    return unless eligible_message?(message)
    return unless autonomous_configuration?(message)
    return if response_already_delivered?(message)

    response = generate_response(message)
    deliver_response(message.conversation, response.text) if response.text.present?
  rescue ActiveRecord::RecordNotFound
    nil
  rescue CandyAI::AI::Error => e
    Rails.logger.warn("CandyAI generation failed: #{e.class.name}: #{e.message}")
    nil
  end

  private

  def eligible_message?(message)
    return false unless message.present? && message.incoming? && !message.private? && message.content_for_llm.present?

    valid_relationships?(message)
  end

  def valid_relationships?(message)
    message.conversation.present? && message.inbox.present? && message.account.present? &&
      message.account_id == message.conversation.account_id && message.account_id == message.inbox.account_id
  end

  def autonomous_configuration?(message)
    configuration = CandyAI::AccountConfiguration.effective(message.inbox)
    configuration['enabled'] == true && configuration['mode'] == 'autonomous' && bot_id.present?
  end

  def generate_response(message)
    configuration = CandyAI::AccountConfiguration.effective(message.inbox)

    CandyAI::AI.orchestrator.respond(
      messages: CandyAI::ContextBuilder.new(message.conversation, account: message.account).messages,
      provider: configuration['provider'].presence || CandyAI.config.default_ai_provider,
      model: configuration['model'].presence || ENV['CANDYAI_AI_MODEL'].presence,
      system_prompt: configuration['system_prompt'].presence,
      temperature: configuration['temperature'],
      max_tokens: configuration['max_tokens']
    )
  end

  def bot_id
    ENV['CANDYAI_AGENT_BOT_ID'].presence
  end

  def response_already_delivered?(message)
    message.conversation.messages.exists?(
      message_type: 'outgoing',
      sender_type: 'AgentBot',
      sender_id: bot_id,
      created_at: message.created_at..
    )
  end

  def deliver_response(conversation, content)
    Messages::MessageBuilder.new(
      nil,
      conversation,
      {
        message_type: 'outgoing',
        content: content,
        content_type: 'text',
        sender_type: 'AgentBot',
        sender_id: Integer(bot_id)
      }
    ).perform
  end
end
