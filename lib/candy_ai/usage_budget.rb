# frozen_string_literal: true

module CandyAI
  # Optional tenant spend guard. It is inactive unless a daily USD limit is
  # configured. Unknown model pricing is treated as unmetered rather than
  # guessed, so enabling the guard never fabricates costs.
  class UsageBudget
    class LimitExceeded < StandardError; end

    def self.check!(account:, daily_limit_usd: nil)
      new(account: account, daily_limit_usd: daily_limit_usd).check!
    end

    def initialize(account:, daily_limit_usd: nil)
      @account = account
      @daily_limit_usd = numeric(daily_limit_usd)
    end

    def check!
      return true unless @daily_limit_usd && @daily_limit_usd.positive?

      spent = CandyAI::UsageRecord
              .for_account(@account)
              .where(requested_at: Time.current.beginning_of_day..Time.current.end_of_day)
              .where.not(estimated_cost: nil)
              .sum(:estimated_cost)

      return true if spent < @daily_limit_usd

      raise LimitExceeded, 'CandyAI daily AI spend limit has been reached'
    end

    private

    def numeric(value)
      return if value.nil? || value == ''
      return value if value.is_a?(Numeric)

      Float(value)
    rescue ArgumentError, TypeError
      nil
    end
  end
end
