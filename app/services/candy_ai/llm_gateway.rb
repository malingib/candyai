# frozen_string_literal: true

module CandyAI
  # The conversation layer depends on this small gateway rather than a vendor
  # SDK. Providers are configured once at boot and selected by account settings.
  class LlmGateway
    class << self
      def complete(provider:, model:, messages:, temperature:, max_tokens:, account: nil, conversation: nil,
                   idempotency_key: nil)
        return nil unless messages.is_a?(Array)

        normalized_messages = messages.filter_map do |message|
          next unless message.is_a?(Hash)

          role = message[:role] || message['role']
          content = message[:content] || message['content']
          next if role.to_s.blank? || content.to_s.strip.blank?

          { role: role.to_s, content: content.to_s }
        end
        return nil if normalized_messages.empty?

        response = CandyAI::AI.router.chat(
          provider: provider,
          model: model,
          messages: normalized_messages,
          temperature: temperature,
          max_tokens: max_tokens
        )

        record_usage(response, account:, conversation:, provider:, model:, idempotency_key:)
        response&.text
      rescue StandardError => e
        # Do not log prompts, provider response bodies, API keys, or customer data.
        Rails.logger.error("[CandyAI] LLM generation failed (#{e.class.name})")
        nil
      end

      private

      def record_usage(response, account:, conversation:, provider:, model:, idempotency_key:)
        return if account.nil? || idempotency_key.blank? || response.nil?

        usage = response.respond_to?(:usage) ? response.usage : {}
        usage = {} unless usage.is_a?(Hash)
        input_tokens = usage['prompt_tokens'] || usage[:prompt_tokens] || usage['input_tokens'] || usage[:input_tokens] || 0
        output_tokens = usage['completion_tokens'] || usage[:completion_tokens] || usage['output_tokens'] || usage[:output_tokens] || 0

        CandyAI::UsageRecorder.record!(
          account: account,
          conversation: conversation,
          idempotency_key: idempotency_key,
          event_type: 'completion',
          provider: provider.to_s,
          model: response.respond_to?(:model) ? response.model.presence || model : model,
          input_tokens: input_tokens.to_i,
          output_tokens: output_tokens.to_i,
          metadata: { 'usage_reported' => !usage.empty? }
        )
      rescue StandardError => e
        # Usage reporting must not turn a successful customer answer into a failure.
        Rails.logger.warn("[CandyAI] Usage recording failed (#{e.class.name})")
      end
    end
  end
end
