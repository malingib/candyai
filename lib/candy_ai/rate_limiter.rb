# frozen_string_literal: true

module CandyAI
  # Protection against accidental generation storms.
  #
  # Uses a dedicated in-memory store so behaviour is identical in test and
  # production, independent of Rails' configured cache_store (the test env
  # uses :null_store). Counts reset on a rolling window.
  #
  # Guards:
  #   * per-account generation rate
  #   * per-conversation generation rate
  #   * duplicate / repeated regeneration (idempotency key)
  class RateLimiter
    class LimitExceeded < StandardError; end

    # Separate store so we never depend on Rails.cache configuration.
    STORE = {}

    def initialize(namespace = 'candy_ai')
      @namespace = namespace
    end

    # Returns true if the request is allowed, otherwise raises LimitExceeded.
    def check!(key:, limit:, window:, idempotency_key: nil)
      now = Time.current
      bucket = fetch_bucket(key)
      sweep(bucket, now, window)

      if idempotency_key.present?
        raise LimitExceeded, 'duplicate generation request' if bucket[:keys].include?(idempotency_key)
      end

      raise LimitExceeded, 'generation rate limit exceeded' if bucket[:entries].size >= limit

      bucket[:entries] << now
      bucket[:keys] << idempotency_key if idempotency_key.present?
      true
    end

    private

    def fetch_bucket(key)
      STORE[store_key(key)] ||= { entries: [], keys: [] }
    end

    def sweep(bucket, now, window)
      cutoff = now - window
      bucket[:entries].reject! { |timestamp| timestamp < cutoff }
      bucket[:keys].reject! { |_k| false }
      # Keys are tied 1:1 to entries; trim to keep them aligned.
      return if bucket[:entries].size >= bucket[:keys].size

      bucket[:keys].shift(bucket[:keys].size - bucket[:entries].size)
    end

    def store_key(key)
      "#{@namespace}:#{key}"
    end
  end
end
