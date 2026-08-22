# frozen_string_literal: true

module CandyAI
  class RespondToMessageJob < ApplicationJob
    queue_as :default

    retry_on StandardError, wait: :exponentially_longer, attempts: 3

    MAX_CONTEXT_MESSAGES = 20

    def perform(message_id)
      message = Message.includes(:conversation, :account, :inbox).find_by(id: message_id)
      return if message.blank? || !eligible_message?(message)

      configuration = CandyAI::AccountConfiguration.effective(message.inbox)
      return unless configuration['enabled'] == true
      return unless configuration['mode'] == 'autonomous'
      return unless bot_id.present?
      return if response_already_delivered?(message)

      response = CandyAI::AI.orchestrator.respond(
        messages: conversation_messages(message.conversation),
        provider: configuration['provider'].presence || CandyAI.config.default_ai_provider,
        model: configuration['model'].presence || ENV['CANDYAI_AI_MODEL'].presence,
        system_prompt: configuration['system_prompt'].presence,
        temperature: configuration['temperature'],
        max_tokens: configuration['max_tokens']
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

    def bot_id
      ENV['CANDYAI_AGENT_BOT_ID'].presence
    end

    def response_already_delivered?(message)
      message.conversation.messages
             .where(message_type: 'outgoing', sender_type: 'AgentBot', sender_id: bot_id)
             .where('created_at >= ?', message.created_at)
             .exists?
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
end
