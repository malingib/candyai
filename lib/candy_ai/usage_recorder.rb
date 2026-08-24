# frozen_string_literal: true

module CandyAI
  # Records safe AI usage metadata for billing/observability.
  #
  # Never stores provider API keys, full prompts, or full customer
  # conversations. Only aggregate signals (tokens, duration, cost estimate,
  # success/failure) scoped to the owning tenant are persisted.
  class UsageRecorder
    def self.record!(account:, inbox: nil, conversation: nil, suggestion: nil,
                     provider:, model:, request_id:, started_at:, success:,
                     response: nil, error_category: nil)
      new.record!(
        account: account, inbox: inbox, conversation: conversation, suggestion: suggestion,
        provider: provider, model: model, request_id: request_id, started_at: started_at,
        success: success, response: response, error_category: error_category
      )
    end

    def record!(account:, inbox:, conversation:, suggestion:, provider:, model:,
                request_id:, started_at:, success:, response:, error_category:)
      duration_ms = compute_duration(started_at)
      usage = safe_usage(response)

      CandyAI::UsageRecord.create!(
        account: account,
        inbox: inbox,
        conversation: conversation,
        suggestion: suggestion,
        provider: provider,
        model: model,
        request_id: request_id,
        requested_at: started_at,
        completed_at: Time.current,
        duration_ms: duration_ms,
        input_tokens: usage[:input_tokens],
        output_tokens: usage[:output_tokens],
        total_tokens: usage[:total_tokens],
        estimated_cost: CandyAI::CostEstimator.estimate(
          provider: provider,
          model: model,
          input_tokens: usage[:input_tokens],
          output_tokens: usage[:output_tokens]
        ),
        success: success,
        error_category: error_category
      )
    rescue ActiveRecord::RecordInvalid, ActiveRecord::RecordNotUnique => e
      Rails.logger.warn({ event: 'candy_ai.usage_record_failed', error: e.class.name }.to_json)
      nil
    end

    private

    def compute_duration(started_at)
      return nil unless started_at

      ((Time.current - started_at) * 1000).round
    end

    def safe_usage(response)
      return {} if response.nil? || !response.respond_to?(:usage)

      usage = response.usage || {}
      {
        input_tokens: usage['prompt_tokens'] || usage[:prompt_tokens],
        output_tokens: usage['completion_tokens'] || usage[:completion_tokens],
        total_tokens: usage['total_tokens'] || usage[:total_tokens]
      }.compact
    end
  end
end
