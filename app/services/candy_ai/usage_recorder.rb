# frozen_string_literal: true

module CandyAI
  class UsageRecorder
    EVENT_TYPES = %w[completion embedding ingestion handoff error].freeze
    MAX_METADATA_BYTES = 16.kilobytes

    # Callers must provide a stable key per logical operation. A unique index
    # makes retries idempotent even when workers retry after a timeout.
    def self.record!(account:, idempotency_key:, event_type:, input_tokens: 0, output_tokens: 0,
                     provider: nil, model: nil, conversation: nil, estimated_cost: 0, currency: 'USD',
                     metadata: {})
      raise ArgumentError, 'unknown usage event type' unless EVENT_TYPES.include?(event_type.to_s)
      raise ArgumentError, 'idempotency key is required' if idempotency_key.blank?
      raise ArgumentError, 'metadata must be an object' unless metadata.is_a?(Hash)
      raise ArgumentError, 'metadata is too large' if metadata.to_json.bytesize > MAX_METADATA_BYTES

      UsageEvent.create_or_find_by!(idempotency_key: idempotency_key.to_s) do |event|
        event.account = account
        event.conversation = conversation
        event.event_type = event_type
        event.input_tokens = input_tokens
        event.output_tokens = output_tokens
        event.provider = provider
        event.model = model
        event.estimated_cost = estimated_cost
        event.currency = currency
        event.metadata = metadata
      end.tap do |event|
        # Never let a reused key silently attribute usage to a different tenant.
        raise ActiveRecord::RecordNotFound, 'usage idempotency key belongs to another account' if event.account_id != account.id
      end
    end

    def self.summary(account:, from:, to: Time.current)
      events = UsageEvent.where(account: account).where(created_at: from...to)
      events.group(:event_type).pluck(
        :event_type,
        Arel.sql('COUNT(*)'),
        Arel.sql('COALESCE(SUM(input_tokens), 0)'),
        Arel.sql('COALESCE(SUM(output_tokens), 0)'),
        Arel.sql('COALESCE(SUM(estimated_cost), 0)')
      ).map do |event_type, count, input_tokens, output_tokens, estimated_cost|
        {
          event_type: event_type,
          events: count,
          input_tokens: input_tokens,
          output_tokens: output_tokens,
          estimated_cost: estimated_cost.to_d
        }
      end
    end
  end
end
