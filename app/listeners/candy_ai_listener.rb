# frozen_string_literal: true

class CandyAIListener < BaseListener
  include Events::Types

  def message_created(event)
    return unless CandyAI.config.enabled

    message = event.data[:message]
    return unless eligible_message?(message)

    configuration = CandyAI::AccountConfiguration.effective(message.inbox)
    return unless configuration['enabled'] == true

    case configuration['mode']
    when 'assist'
      suggestion = CandyAI::Suggestion.request_for(message)
      CandyAI::GenerateSuggestionJob.perform_later(suggestion.id) if suggestion.status == 'pending'
    when 'autonomous'
      CandyAI::RespondToMessageJob.perform_later(message.id)
    end
  end

  private

  def eligible_message?(message)
    message.present? && message.incoming? && !message.private? &&
      message.content_for_llm.present? && message.inbox.present? &&
      message.account.present? && message.conversation.present?
  end
end
