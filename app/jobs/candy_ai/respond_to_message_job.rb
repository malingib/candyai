# frozen_string_literal: true

module CandyAI
  class RespondToMessageJob < ApplicationJob
    queue_as :default

    retry_on StandardError, wait: :exponentially_longer, attempts: 3

    MAX_CONTEXT_MESSAGES = 20

    def perform(message_id)
      message = Message.includes(:conversation, :account, :inbox).find_by(id: message_id)
      return if message.blank? || !eligible_message?(message)

      response = CandyAI::AI.orchestrator.respond(
        messages: conversation_messages(message.conversation),
        provider: CandyAI.config.default_ai_provider,
        model: ENV['CANDYAI_AI_MODEL'].presence
      )

      return if response.text.blank?

      deliver_response(message.conversation, response.text)
    rescue ActiveRecord::RecordNotFound
      nil
    end

    private

    def eligible_message?(message)
      message.incoming? && !message.private? && message.content_for_llm.present?
    end

    def conversation_messages(conversation)
      conversation.messages
                  .chat
                  .where(private: false)
                  .order(created_at: :desc)
                  .limit(MAX_CONTEXT_MESSAGES)
                  .to_a
                  .reverse
                  .filter_map { |message| llm_message(message) }
    end

    def llm_message(message)
      content = message.content_for_llm
      return if content.blank?

      {
        role: message.incoming? ? 'user' : 'assistant',
        content: content.to_s
      }
    end

    def deliver_response(conversation, content)
      sender_id = Integer(ENV.fetch('CANDYAI_AGENT_BOT_ID'))

      Messages::MessageBuilder.new(
        nil,
        conversation,
        {
          message_type: 'outgoing',
          content: content,
          content_type: 'text',
          sender_type: 'AgentBot',
          sender_id: sender_id
        }
      ).perform
    end
  end
end
