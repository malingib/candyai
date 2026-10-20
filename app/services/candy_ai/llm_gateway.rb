# frozen_string_literal: true

# The conversation layer depends on this small gateway rather than a vendor
# SDK. Providers are configured once at boot and selected by account settings.
class CandyAI::LlmGateway
  class << self
    def complete(provider:, model:, messages:, generation: {}, usage_context: nil)
      normalized_messages = normalize_messages(messages)
      return nil if normalized_messages.empty?

      response = CandyAI::AI.router.chat(
        provider: provider,
        model: model,
        messages: normalized_messages,
        **generation
      )
      record_usage(response, provider, model, usage_context)
      response&.text
    rescue StandardError => e
      # Do not log prompts, provider response bodies, API keys, or customer data.
      Rails.logger.error("[CandyAI] LLM generation failed (#{e.class.name})")
      nil
    end

    private

    def normalize_messages(messages)
      return [] unless messages.is_a?(Array)

      messages.filter_map { |message| normalize_message(message) }
    end

    def normalize_message(message)
      return unless message.is_a?(Hash)

      role = message[:role] || message['role']
      content = message[:content] || message['content']
      return if role.to_s.blank? || content.to_s.strip.blank?

      { role: role.to_s, content: content.to_s }
    end

    def record_usage(response, provider, model, usage_context)
      return unless usage_context.present? && response.present?

      usage = provider_usage(response)
      context = usage_context.symbolize_keys
      CandyAI::UsageRecorder.record!(
        account: context.fetch(:account),
        conversation: context[:conversation],
        idempotency_key: context[:idempotency_key],
        event_type: 'completion',
        provider: provider.to_s,
        model: response_model(response, model),
        input_tokens: token_count(usage, 'prompt_tokens', 'input_tokens'),
        output_tokens: token_count(usage, 'completion_tokens', 'output_tokens'),
        metadata: { 'usage_reported' => usage.present? }
      )
    rescue StandardError => e
      # Usage reporting must not turn a successful customer answer into a failure.
      Rails.logger.warn("[CandyAI] Usage recording failed (#{e.class.name})")
    end

    def provider_usage(response)
      usage = response.respond_to?(:usage) ? response.usage : {}
      usage.is_a?(Hash) ? usage : {}
    end

    def response_model(response, fallback)
      response.respond_to?(:model) ? response.model.presence || fallback : fallback
    end

    def token_count(usage, primary, fallback)
      (usage[primary] || usage[primary.to_sym] || usage[fallback] || usage[fallback.to_sym] || 0).to_i
    end
  end
end
