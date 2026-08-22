# frozen_string_literal: true

class CandyAI::GenerateSuggestionJob < ApplicationJob
  queue_as :default

  def perform(suggestion_id)
    suggestion = CandyAI::Suggestion.includes(:message, :conversation, :account, :inbox).find_by(id: suggestion_id)
    return unless suggestion

    message = suggestion.message
    return unless suggestion_in_scope?(suggestion, message)

    started_at = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    return unless mark_generating(suggestion)

    process_generation(suggestion, message, started_at)
  rescue CandyAI::AI::Error => e
    fail_suggestion(suggestion, failure_category(e), e.message) if suggestion
    nil
  end

  private

  def mark_generating(suggestion)
    suggestion.with_lock do
      return false unless suggestion.status == 'pending'

      suggestion.update!(status: 'generating', generation_started_at: Time.current,
                         request_id: request_id)
    end
    true
  end

  def process_generation(suggestion, message, started_at)
    configuration = configuration_for(message)
    return fail_suggestion(suggestion, 'disabled', 'CandyAI Assist Mode is disabled') unless configuration

    context = build_context(message)
    response = generate_response(message, configuration, context)
    return fail_suggestion(suggestion, 'malformed_response', 'AI provider returned an empty response') if response.text.blank?

    complete_suggestion(suggestion, response, started_at, context_metadata: { 'message_count' => context.length })
  end

  def configuration_for(message)
    return unless CandyAI.config.enabled && eligible_message?(message)

    configuration = CandyAI::AccountConfiguration.effective(message.inbox)
    configuration if configuration['enabled'] == true && configuration['mode'] == 'assist'
  end

  def eligible_message?(message)
    return false unless message.present? && message.incoming? && !message.private? && message.content_for_llm.present?

    valid_relationships?(message)
  end

  def suggestion_in_scope?(suggestion, message)
    message.present? && suggestion.account_id == message.account_id &&
      suggestion.inbox_id == message.inbox_id && suggestion.conversation_id == message.conversation_id
  end

  def valid_relationships?(message)
    message.conversation.present? && message.inbox.present? && message.account.present? &&
      message.account_id == message.conversation.account_id && message.account_id == message.inbox.account_id
  end

  def build_context(message)
    CandyAI::ContextBuilder.new(message.conversation, account: message.account, inbox: message.inbox).messages
  end

  def generate_response(_message, configuration, context)
    CandyAI::AI.orchestrator.respond(
      messages: context,
      provider: configuration['provider'].presence || CandyAI.config.default_ai_provider,
      model: configuration['model'].presence || ENV['CANDYAI_AI_MODEL'].presence,
      system_prompt: configuration['system_prompt'].presence,
      temperature: configuration['temperature'],
      max_tokens: configuration['max_tokens']
    )
  end

  def complete_suggestion(suggestion, response, started_at, context_metadata:)
    suggestion.update!(
      status: 'generated',
      content: response.text,
      provider: response.provider,
      model: response.model,
      usage: response.usage || {},
      context_metadata: context_metadata,
      generated_at: Time.current,
      duration_ms: elapsed_ms(started_at)
    )
    log_event(
      'generation_completed', suggestion, provider: response.provider, model: response.model,
                                          duration_ms: suggestion.duration_ms
    )
  end

  def fail_suggestion(suggestion, category, message)
    suggestion.update!(status: 'failed', failure_category: category, error_message: sanitize_error(message),
                       duration_ms: elapsed_since(suggestion.generation_started_at))
    log_event('generation_failed', suggestion, error_category: category)
  rescue ActiveRecord::RecordNotFound, ActiveRecord::RecordInvalid
    nil
  end

  def failure_category(error)
    case error
    when CandyAI::AI::AuthenticationError then 'authentication'
    when CandyAI::AI::TimeoutError then 'timeout'
    when CandyAI::AI::RateLimitError then 'rate_limit'
    when CandyAI::AI::MalformedResponseError then 'malformed_response'
    when CandyAI::AI::UnavailableError then 'unavailable'
    when CandyAI::AI::InvalidRequestError then 'invalid_request'
    else 'provider_error'
    end
  end

  def sanitize_error(message)
    message.to_s.gsub(/Bearer\s+\S+/i, 'Bearer [REDACTED]').truncate(500)
  end

  def request_id
    @request_id ||= SecureRandom.uuid
  end

  def elapsed_ms(started_at)
    ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - started_at) * 1000).round
  end

  def elapsed_since(started_at)
    return unless started_at

    ((Time.current - started_at) * 1000).round
  end

  def log_event(event, suggestion, **metadata)
    Rails.logger.info({ event: "candy_ai.#{event}", account_id: suggestion.account_id,
                        inbox_id: suggestion.inbox_id, conversation_id: suggestion.conversation_id,
                        suggestion_id: suggestion.id, request_id: suggestion.request_id,
                        **metadata }.to_json)
  end
end
