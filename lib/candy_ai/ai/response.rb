# frozen_string_literal: true

module CandyAI
  module AI
    # Normalized provider response. Provider-specific payloads must not leak
    # into Assist Mode application code; only the normalized fields are used.
    Response = Data.define(
      :text, :model, :provider, :usage, :finish_reason,
      :request_id, :latency_ms, :metadata, :raw
    ) do
      def initialize(text:, model: nil, provider: nil, usage: {}, finish_reason: nil,
                     request_id: nil, latency_ms: nil, metadata: {}, raw: nil)
        super
      end

      def success?
        text.present?
      end
    end
  end
end
