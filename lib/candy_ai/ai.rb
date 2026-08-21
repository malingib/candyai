# frozen_string_literal: true

require_relative "ai/provider"
require_relative "ai/response"
require_relative "ai/provider_registry"

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
  end
end
