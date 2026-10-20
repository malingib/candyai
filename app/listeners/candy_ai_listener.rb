# frozen_string_literal: true

class CandyAIListener < BaseListener
  include Events::Types

  def message_created(event)
    return unless CandyAI.config.enabled

    message = extract_message_and_account(event)[0]
    return unless eligible_message?(message)

    configuration = CandyAI::AccountConfiguration.effective(message.inbox)
    return unless configuration['enabled'] == true
    return unless configuration['mode'] == 'autonomous'

    CandyAI::RespondToMessageJob.perform_later(message.id)
  end

  private

  def eligible_message?(message)
    return false if message.blank?
    return false unless message.incoming?
    return false if message.private?
    return false if message.content_for_llm.blank?
    return false unless message.respond_to?(:inbox) && message.inbox.present?

    true
  end
end
