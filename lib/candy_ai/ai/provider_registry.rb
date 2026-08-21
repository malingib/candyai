# frozen_string_literal: true

module CandyAI
  module AI
    class ProviderRegistry
      def initialize
        @providers = {}
      end

      def register(name, provider)
        key = name.to_s.strip.downcase
        raise ArgumentError, "provider name cannot be empty" if key.empty?

        @providers[key] = provider
      end

      def fetch(name)
        provider = @providers[name.to_s.strip.downcase]
        raise KeyError, "CandyAI AI provider not registered: #{name}" unless provider

        provider
      end

      def key?(name)
        @providers.key?(name.to_s.strip.downcase)
      end

      def names
        @providers.keys.sort
      end
    end
  end
end
