# frozen_string_literal: true

module CandyAI
  class LlmGateway
    class << self
      def complete(provider:, model:, prompt:, temperature:, max_tokens:)
        return nil unless defined?(RubyLLM)

        chat = RubyLLM.chat(model: model)
        response = chat.with_instructions("Provider: #{provider}").ask(prompt)
        response.content
      rescue StandardError => e
        Rails.logger.error("[CandyAI] LLM generation failed: #{e.class}: #{e.message}")
        nil
      end
    end
  end
end
