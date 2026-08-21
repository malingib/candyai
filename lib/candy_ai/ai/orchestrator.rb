# frozen_string_literal: true

module CandyAI
  module AI
    # First application-level AI loop. It deliberately knows nothing about
    # Chatwoot persistence; callers provide the conversation messages and own
    # delivery of the normalized response.
    class Orchestrator
      DEFAULT_SYSTEM_PROMPT = <<~PROMPT.freeze
        You are CandyAI, an AI customer-support assistant.
        Be helpful, concise, accurate, and honest about uncertainty.
        If you cannot answer from the supplied conversation context, say so
        rather than inventing facts.
      PROMPT

      def initialize(router: CandyAI::AI.router, system_prompt: DEFAULT_SYSTEM_PROMPT)
        @router = router
        @system_prompt = system_prompt
      end

      def respond(messages:, provider: nil, model: nil, system_prompt: nil, **options)
        raise ArgumentError, 'messages must be an Array' unless messages.is_a?(Array)

        response = @router.chat(
          messages: normalized_messages(messages, system_prompt),
          provider: provider,
          model: model,
          **options
        )

        response
      end

      private

      def normalized_messages(messages, system_prompt)
        prompt = system_prompt || @system_prompt
        return messages if prompt.nil? || prompt.empty?

        [{ role: 'system', content: prompt }] + messages
      end
    end
  end
end
