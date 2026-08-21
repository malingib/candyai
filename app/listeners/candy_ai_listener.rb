# frozen_string_literal: true

class CandyAIListener < BaseListener
  include Events::Types

  def message_created(event)
    return unless CandyAI.config.enabled

    message = extract_message_and_account(event)[0]
    return unless eligible_message?(message)

    CandyAI::RespondToMessageJob.perform_later(message.id)
  end

  private

  def eligible_message?(message)
    return false unless message.incoming?
    return false if message.private?
    return false if message.content_for_llm.blank?
    return false unless CandyAI.config.default_ai_provider.present?
    return false unless ENV['CANDYAI_AGENT_BOT_ID'].present?

    true
  end
end
