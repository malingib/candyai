# frozen_string_literal: true

# Selects a registered provider while keeping routing policy outside the
# Chatwoot conversation layer.
class CandyAI::AI::Router
  def initialize(registry: CandyAI::AI.registry, default_provider: nil)
    @registry = registry
    @default_provider = default_provider
  end

  def provider(name: nil)
    provider_name = name || @default_provider || CandyAI.config.default_ai_provider
    raise ArgumentError, 'No CandyAI AI provider configured' if provider_name.nil? || provider_name.to_s.empty?

    @registry.fetch(provider_name)
  end

  def chat(messages:, provider: nil, model: nil, **)
    selected = provider(name: provider)
    selected.chat(messages: messages, model: model, **)
  end
end
