# frozen_string_literal: true

class CandyAI::UsageRecorder
  EVENT_TYPES = %w[completion embedding ingestion handoff error].freeze
  MAX_METADATA_BYTES = 16.kilobytes

  # Callers must provide a stable key per logical operation. A unique index
  # makes retries idempotent even when workers retry after a timeout.
  def self.record!(account:, **attributes)
    validate_attributes!(attributes)
    idempotency_key = attributes.fetch(:idempotency_key).to_s
    event = CandyAI::UsageEvent.create_or_find_by!(idempotency_key: idempotency_key) do |record|
      record.assign_attributes(event_attributes(account, attributes))
    end

    # Never let a reused key silently attribute usage to a different tenant.
    raise ActiveRecord::RecordNotFound, 'usage idempotency key belongs to another account' if event.account_id != account.id

    event
  end

  def self.summary(account:, from:, to: Time.current)
    events = CandyAI::UsageEvent.where(account: account).where(created_at: from...to)
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

  def self.validate_attributes!(attributes)
    raise ArgumentError, 'unknown usage event type' unless EVENT_TYPES.include?(attributes[:event_type].to_s)
    raise ArgumentError, 'idempotency key is required' if attributes[:idempotency_key].blank?

    metadata = attributes.fetch(:metadata, {})
    raise ArgumentError, 'metadata must be an object' unless metadata.is_a?(Hash)
    raise ArgumentError, 'metadata is too large' if metadata.to_json.bytesize > MAX_METADATA_BYTES
  end
  private_class_method :validate_attributes!

  def self.event_attributes(account, attributes)
    attributes.slice(
      :event_type, :input_tokens, :output_tokens, :provider, :model,
      :estimated_cost, :currency, :metadata
    ).reverse_merge(input_tokens: 0, output_tokens: 0, estimated_cost: 0, currency: 'USD', metadata: {})
              .merge(account: account, conversation: attributes[:conversation])
  end
  private_class_method :event_attributes
end
