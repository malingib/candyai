# frozen_string_literal: true

class CandyAI::GenerateSuggestionJob < ApplicationJob
  queue_as :default

  ACCOUNT_WINDOW = 1.minute
  ACCOUNT_LIMIT = 20
  CONVERSATION_WINDOW = 1.minute
  CONVERSATION_LIMIT = 5

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
  rescue CandyAI::RateLimiter::LimitExceeded => e
    fail_suggestion(suggestion, 'rate_limited', e.message) if suggestion
    nil
  rescue CandyAI::UsageBudget::LimitExceeded => e
    fail_suggestion(suggestion, 'cost_budget', e.message) if suggestion
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
    configuration = effective_configuration(message)
    return fail_suggestion(suggestion, 'disabled', 'CandyAI Assist Mode is disabled') unless configuration

    enforce_rate_limits!(suggestion, configuration)
    CandyAI::UsageBudget.check!(account: suggestion.account,
                                daily_limit_usd: configuration['daily_cost_limit_usd'])

    success = false
    response = nil
    error_category = nil
    begin
      context = build_context(message, configuration)
      intelligence = analyze_intelligence(context)
      response = generate_response(message, configuration, context)

      quality = CandyAI::SuggestionQuality.new(response)
      unless quality.valid?
        error_category = 'quality'
        return fail_suggestion(suggestion, 'quality', "Quality check failed: #{quality.failures.join(', ')}")
      end

      complete_suggestion(suggestion, response, started_at, intelligence: intelligence,
                                                            context_metadata: context_metadata(context, intelligence))
      success = true
    rescue CandyAI::AI::Error => e
      error_category = failure_category(e)
      raise
    ensure
      record_usage(suggestion, configuration, response, started_at, success, error_category)
    end
  end

  def effective_configuration(message)
    return unless CandyAI.config.enabled? && eligible_message?(message)

    configuration = CandyAI::ConfigurationResolver.for(account: message.account, inbox: message.inbox)
    return nil unless configuration['enabled'] == true && configuration['assist_enabled'] == true

    configuration
  end

  def enforce_rate_limits!(suggestion, configuration)
    limiter = CandyAI::RateLimiter.new
    limit = configuration['generation_limit'] || CandyAI::ConfigurationResolver::DEFAULT_GENERATION_LIMIT
    limiter.check!(key: "account:#{suggestion.account_id}", limit: ACCOUNT_LIMIT, window: ACCOUNT_WINDOW)
    limiter.check!(key: "conversation:#{suggestion.conversation_id}", limit: CONVERSATION_LIMIT, window: CONVERSATION_WINDOW)
    limiter.check!(key: "suggestion:#{suggestion.message_id}", limit: limit, window: 10.minutes,
                   idempotency_key: suggestion.request_id)
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

  def build_context(message, configuration)
    CandyAI::ContextBuilder.new(
      message.conversation,
      account: message.account,
      inbox: message.inbox,
      account_instructions: configuration['account_instructions'],
      inbox_instructions: configuration['inbox_instructions']
    ).build
  end

  def analyze_intelligence(context)
    CandyAI::ConversationIntelligence.new.analyze(context)
  end

  def generate_response(_message, configuration, context)
    system_prompt = CandyAI::PromptBuilder.new(
      account_instructions: configuration['account_instructions'],
      inbox_instructions: configuration['inbox_instructions']
    ).build

    messages = context[:conversation] || context['conversation'] || []

    CandyAI::AI.router.chat(
      messages: messages,
      provider: configuration['provider'].presence || CandyAI.config.default_ai_provider,
      model: configuration['model'].presence || ENV['CANDYAI_AI_MODEL'].presence,
      fallback: configuration['fallback_provider'].present?,
      temperature: configuration['temperature'],
      max_tokens: configuration['max_tokens'],
      system: system_prompt
    )
  end

  def complete_suggestion(suggestion, response, started_at, intelligence:, context_metadata:)
    suggestion.update!(
      status: 'generated', content: response.text, provider: response.provider,
      model: response.model, usage: response.usage || {}, intelligence: intelligence,
      quality_status: 'pass', context_metadata: context_metadata, generated_at: Time.current,
      duration_ms: elapsed_ms(started_at)
    )
    log_event('generation_completed', suggestion, provider: response.provider, model: response.model,
              duration_ms: suggestion.duration_ms, intelligence: intelligence)
  end

  def fail_suggestion(suggestion, category, message)
    suggestion.update!(status: 'failed', failure_category: category,
                       error_message: sanitize_error(message), quality_status: 'fail',
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
    message.to_s.gsub(/Bearer\s+\S+/i, 'Bearer [REDACTED]')
           .gsub(/sk-[a-zA-Z0-9]{20,}/, '[REDACTED]')
           .truncate(500)
  end

  def record_usage(suggestion, configuration, response, started_at, success, error_category = nil)
    CandyAI::UsageRecorder.record!(
      account: suggestion.account, inbox: suggestion.inbox, conversation: suggestion.conversation,
      suggestion: suggestion,
      provider: response&.provider || configuration['provider'].presence || CandyAI.config.default_ai_provider,
      model: response&.model || configuration['model'].presence,
      request_id: suggestion.request_id, started_at: started_at.is_a?(Time) ? started_at : Time.current,
      success: success, response: response,
      error_category: success ? nil : error_category.presence || suggestion.failure_category
    )
  end

  def context_metadata(context, intelligence)
    {
      'message_count' => (context[:conversation] || context['conversation'] || []).length,
      'intelligence' => intelligence
    }
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
