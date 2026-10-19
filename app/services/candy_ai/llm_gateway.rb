# frozen_string_literal: true

module CandyAI
  # The conversation layer depends on this small gateway rather than a vendor
  # SDK. Providers are configured once at boot and selected by account settings.
  class LlmGateway
    class << self
      def complete(provider:, model:, prompt:, temperature:, max_tokens:)
        return nil if prompt.to_s.strip.empty?

        response = CandyAI::AI.router.chat(
          provider: provider,
          model: model,
          messages: [{ role: 'user', content: prompt }],
          temperature: temperature,
          max_tokens: max_tokens
        )

        response&.text
      rescue StandardError => e
        # Do not log prompts, provider response bodies, API keys, or other
        # customer content. Keep the class for diagnostics without leaking data.
        Rails.logger.error("[CandyAI] LLM generation failed (#{e.class.name})")
        nil
      end
    end
  end
end
