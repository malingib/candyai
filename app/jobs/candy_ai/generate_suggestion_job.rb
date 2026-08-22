# frozen_string_literal: true

class CandyAI::GenerateSuggestionJob < ApplicationJob
  queue_as :default

  def perform(message_id)
    message = Message.includes(:conversation, :account, :inbox).find_by(id: message_id)
    configuration = configuration_for(message)
    return unless configuration

    response = generate_response(message, configuration)
    return if response.text.blank?

    create_suggestion(message, response)
  rescue CandyAI::AI::Error => e
    create_failed_suggestion(message, e) if message.present?
    Rails.logger.warn("CandyAI assist generation failed: #{e.class.name}: #{e.message}")
    nil
  end

  private

  def configuration_for(message)
    return unless CandyAI.config.enabled && eligible_message?(message)

    configuration = CandyAI::AccountConfiguration.effective(message.inbox)
    configuration if configuration['enabled'] == true && configuration['mode'] == 'assist'
  end

  def eligible_message?(message)
    return false unless message.present? && message.incoming? && !message.private? && message.content_for_llm.present?

    valid_relationships?(message)
  end

  def valid_relationships?(message)
    message.conversation.present? && message.inbox.present? && message.account.present? &&
      message.account_id == message.conversation.account_id && message.account_id == message.inbox.account_id
  end

  def generate_response(message, configuration)
    CandyAI::AI.orchestrator.respond(
      messages: CandyAI::ContextBuilder.new(message.conversation, account: message.account).messages,
      provider: configuration['provider'].presence || CandyAI.config.default_ai_provider,
      model: configuration['model'].presence || ENV['CANDYAI_AI_MODEL'].presence,
      system_prompt: configuration['system_prompt'].presence,
      temperature: configuration['temperature'],
      max_tokens: configuration['max_tokens']
    )
  end

  def create_suggestion(message, response)
    CandyAI::Suggestion.create!(
      account: message.account,
      inbox: message.inbox,
      conversation: message.conversation,
      message: message,
      content: response.text,
      provider: response.provider,
      model: response.model,
      usage: response.usage || {}
    )
  end

  def create_failed_suggestion(message, error)
    CandyAI::Suggestion.create!(
      account: message.account,
      inbox: message.inbox,
      conversation: message.conversation,
      message: message,
      status: 'failed',
      error_message: error.message
    )
  end
end
