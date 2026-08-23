# frozen_string_literal: true

module CandyAI
  # Pre-persistence validation for a generated suggestion.
  #
  # Deterministic and testable. Rejects responses that are empty, oversized,
  # structurally invalid, or that leak secrets / system prompts / provider
  # credentials. It does NOT perform heavy content moderation.
  class SuggestionQuality
    MAX_CONTENT_LENGTH = 8_000
    SECRET_PATTERNS = [
      /sk-[a-zA-Z0-9]{20,}/,
      /AIza[0-9A-Za-z_\-]{35}/,
      /AKIA[0-9A-Z]{16}/,
      /Bearer\s+[A-Za-z0-9\-._~+\/]+/i,
      /xox[baprs]-[A-Za-z0-9-]+/,
      /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\./
    ].freeze

    LEAK_PATTERNS = [
      /system prompt:/i,
      /internal instructions/i,
      /you are candyai/i,
      /hard rules/i
    ].freeze

    attr_reader :response, :failures

    def initialize(response)
      @response = response
      @failures = []
    end

    def valid?
      @failures = []
      check_structural_validity
      return failures.empty? unless valid_structure?

      check_presence
      check_size
      check_secret_leakage
      check_system_prompt_leakage
      failures.empty?
    end

    def status
      valid? ? 'pass' : 'fail'
    end

    private

    def valid_structure?
      response.respond_to?(:text) && response.text.is_a?(String)
    end

    def text
      valid_structure? ? response.text : ''
    end

    def check_structural_validity
      failures << 'invalid_structure' unless valid_structure?
    end

    def check_presence
      failures << 'empty_response' if text.to_s.strip.empty?
    end

    def check_size
      return if text.to_s.length <= MAX_CONTENT_LENGTH

      failures << 'oversized_response'
    end

    def check_secret_leakage
      return if text.blank?

      SECRET_PATTERNS.each do |pattern|
        next unless text.match?(pattern)

        failures << 'secret_leakage'
        break
      end
    end

    def check_system_prompt_leakage
      return if text.blank?

      LEAK_PATTERNS.each do |pattern|
        next unless text.match?(pattern)

        failures << 'system_prompt_leakage'
        break
      end
    end
  end
end
