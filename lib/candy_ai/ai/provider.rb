# frozen_string_literal: true

module CandyAI
  module AI
    # Stable provider contract for CandyAI's model layer.
    # Providers should return a normalized response hash and may expose
    # provider-specific metadata without leaking it into application code.
    class Provider
      def initialize(config = {})
        @config = config || {}
      end

      def chat(messages:, model: nil, **_options)
        raise NotImplementedError, "#{self.class} must implement #chat"
      end

      private

      attr_reader :config
    end
  end
end
