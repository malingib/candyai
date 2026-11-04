# frozen_string_literal: true

class CandyAI::RespondToMessageJob < ApplicationJob
  queue_as :default

  retry_on StandardError, wait: :exponentially_longer, attempts: 3

  def perform(message_id)
    message = Message.includes(:conversation, :account, :inbox).find_by(id: message_id)
    return if message.blank? || !eligible_message?(message)

    respond_to_message(message)
  rescue ActiveRecord::RecordNotFound
    nil
  end

  private

  def respond_to_message(message)
    configuration = CandyAI::AccountConfiguration.effective(message.inbox)
    return unless autonomous_enabled?(configuration)
    return if bot_id.blank? || response_already_delivered?(message)

    result = CandyAI::ConversationOrchestrator.process(
      conversation: message.conversation,
      message: message
    )

    case result.status
    when :reply
      deliver_response(message.conversation, result.reply) if result.reply.present?
    when :handoff
      # Do not send a handoff promise until Chatwoot assignment and agent
      # notification have actually succeeded. Keep the reason observable.
      Rails.logger.info(
        "[CandyAI] handoff requested reason=#{result.reason} " \
        "conversation_id=#{message.conversation_id}"
      )
    when :assist
      Rails.logger.debug(
        "[CandyAI] assist result requires agent suggestion UI " \
        "conversation_id=#{message.conversation_id}"
      )
    end
  end

  def autonomous_enabled?(configuration)
    configuration['enabled'] == true && configuration['mode'] == 'autonomous'
  end

  def eligible_message?(message)
    message.incoming? && !message.private? && message.content_for_llm.present? &&
      message.conversation.present? && message.inbox.present?
  end

  def bot_id
    ENV['CANDYAI_AGENT_BOT_ID'].presence
  end

  def response_already_delivered?(message)
    message.conversation.messages
           .where(message_type: 'outgoing', sender_type: 'AgentBot', sender_id: bot_id)
           .exists?(['created_at >= ?', message.created_at])
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
