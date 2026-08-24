# frozen_string_literal: true

module CandyAI
  module AI
    # Selects a registered provider while keeping routing policy outside the
    # Chatwoot conversation layer.
    class Router
      def initialize(registry: CandyAI::AI.registry, default_provider: nil,
                     fallback_provider: nil, fallback_model: nil)
        @registry = registry
        @default_provider = default_provider
        @fallback_provider = fallback_provider
        @fallback_model = fallback_model
      end

      def provider(name: nil)
        provider_name = name || @default_provider || CandyAI.config.default_ai_provider
        raise ArgumentError, 'No CandyAI AI provider configured' if provider_name.nil? || provider_name.to_s.empty?

        @registry.fetch(provider_name)
      end

      def chat(messages:, provider: nil, model: nil, fallback: false, fallback_model: nil, system: nil, **options)
        selected_name = resolve_provider_name(provider)
        prepared = prepend_system(messages, system)
        attempt_chat(selected_name, prepared, model, options)
      rescue CandyAI::AI::ProviderError => e
        if fallback && @fallback_provider.present? && @fallback_provider.to_s != selected_name.to_s
          selected_model = fallback_model.presence || @fallback_model.presence
          Rails.logger.warn({ event: 'candy_ai.provider_fallback', from: selected_name,
                              to: @fallback_provider, model: selected_model, error: e.class.name }.to_json)
          attempt_chat(@fallback_provider, prepared, selected_model, options)
        else
          raise
        end
      end

      private

      def prepend_system(messages, system)
        return messages if system.blank?

        [{ role: 'system', content: system.to_s }] + messages
      end

      def resolve_provider_name(name)
        provider_name = name || @default_provider || CandyAI.config.default_ai_provider
        raise ArgumentError, 'No CandyAI AI provider configured' if provider_name.nil? || provider_name.to_s.empty?

        provider_name
      end

      def attempt_chat(name, messages, model, options)
        selected = @registry.fetch(name)
        selected.chat(messages: messages, model: model, **options)
      end
    end
  end
end
