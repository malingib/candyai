# frozen_string_literal: true

require_relative "ai/provider"
require_relative "ai/error"
require_relative "ai/response"
require_relative "ai/provider_registry"
require_relative "ai/openai_compatible_provider"
require_relative "ai/router"
require_relative "ai/orchestrator"

module CandyAI
  module AI
    def self.registry
      @registry ||= ProviderRegistry.new
    end

    def self.register_provider(name, provider)
      registry.register(name, provider)
    end

    def self.provider(name = nil)
      registry.fetch(name || CandyAI.config.default_ai_provider)
    end

    def self.register_openai_compatible(name:, api_key: nil, base_url: nil, model: nil, **options)
      provider = OpenAICompatibleProvider.new(
        options.merge(
          api_key: api_key,
          base_url: base_url,
          model: model
        ).compact
      )
      register_provider(name, provider)
      provider
    end

    def self.router
      @router ||= Router.new
    end

    def self.orchestrator
      @orchestrator ||= Orchestrator.new
    end
  end
end
