# frozen_string_literal: true

module CandyAI
  # The conversation layer depends on this small gateway rather than a vendor
  # SDK. Providers are configured once at boot and selected by account settings.
  class LlmGateway
    class << self
      def complete(provider:, model:, messages:, temperature:, max_tokens:)
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

        response&.text
      rescue StandardError => e
        # Do not log prompts, provider response bodies, API keys, or customer data.
        Rails.logger.error("[CandyAI] LLM generation failed (#{e.class.name})")
        nil
      end
    end
  end
end
