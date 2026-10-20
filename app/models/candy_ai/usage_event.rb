# frozen_string_literal: true

module CandyAI
  class UsageEvent < ApplicationRecord
    self.table_name = 'candy_ai_usage_events'

    belongs_to :account
    belongs_to :conversation, optional: true

    validates :event_type, :idempotency_key, presence: true
    validates :input_tokens, :output_tokens, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
    validates :estimated_cost, numericality: { greater_than_or_equal_to: 0 }
    validates :currency, inclusion: { in: %w[USD KES] }

    scope :since, ->(time) { where(created_at: time..) }
    scope :for_period, ->(start_time, end_time) { where(created_at: start_time...end_time) }
  end
end
