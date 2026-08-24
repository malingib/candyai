# frozen_string_literal: true

module CandyAI
  # Converts allow-listed conversation signals into an explicit handoff
  # recommendation. This class never performs the handoff itself.
  class HandoffDecision
    ACTIONS = %w[continue recommend_handoff].freeze
    REASONS = %w[
      customer_requested_human
      high_risk_urgent_negative
      resolved
      disabled
      none
    ].freeze

    attr_reader :action, :reason

    def self.evaluate(intelligence:, handoff_enabled: true)
      new(intelligence: intelligence, handoff_enabled: handoff_enabled).evaluate
    end

    def initialize(intelligence:, handoff_enabled: true)
      @intelligence = intelligence.to_h.stringify_keys
      @handoff_enabled = ActiveModel::Type::Boolean.new.cast(handoff_enabled)
    end

    def evaluate
      if resolved?
        build('continue', 'resolved')
      elsif customer_requested_human?
        build(@handoff_enabled ? 'recommend_handoff' : 'continue', 'customer_requested_human')
      elsif high_risk_urgent_negative?
        build(@handoff_enabled ? 'recommend_handoff' : 'continue', 'high_risk_urgent_negative')
      else
        build('continue', 'none')
      end
    end

    private

    def customer_requested_human?
      @intelligence['needs_human'] == true &&
        @intelligence['urgency'].to_s == 'high' ||
        @intelligence['needs_human'] == true && @intelligence['intent'].to_s == 'complaint'
    end

    def high_risk_urgent_negative?
      @intelligence['sentiment'].to_s == 'negative' && @intelligence['urgency'].to_s == 'high'
    end

    def resolved?
      @intelligence['resolved'] == true
    end

    def build(action, reason)
      {
        'action' => ACTIONS.include?(action) ? action : 'continue',
        'reason' => REASONS.include?(reason) ? reason : 'none',
        'enabled' => @handoff_enabled
      }.freeze
    end
  end
end
