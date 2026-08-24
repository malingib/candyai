# frozen_string_literal: true

require 'json'

module CandyAI
  # Estimates provider spend without ever becoming a billing authority.
  #
  # Pricing is opt-in through CANDYAI_MODEL_PRICING_JSON and is expressed in
  # USD per 1M input/output tokens. Unknown models deliberately return nil.
  class CostEstimator
    PRICING_ENV = 'CANDYAI_MODEL_PRICING_JSON'
    MILLION = 1_000_000.0

    def self.estimate(provider:, model:, input_tokens:, output_tokens:)
      new.estimate(
        provider: provider,
        model: model,
        input_tokens: input_tokens,
        output_tokens: output_tokens
      )
    end

    def estimate(provider:, model:, input_tokens:, output_tokens:)
      pricing = pricing_for(provider, model)
      return nil unless pricing

      input = numeric(input_tokens)
      output = numeric(output_tokens)
      return nil if input.nil? && output.nil?

      ((input.to_f * pricing.fetch('input_per_million', 0).to_f) / MILLION) +
        ((output.to_f * pricing.fetch('output_per_million', 0).to_f) / MILLION)
    end

    private

    def pricing_for(provider, model)
      return if provider.blank? || model.blank?

      catalog = JSON.parse(ENV.fetch(PRICING_ENV, '{}'))
      exact = catalog["#{provider}/#{model}"] || catalog[model] || catalog[provider]
      return unless exact.is_a?(Hash)

      exact.stringify_keys
    rescue JSON::ParserError, TypeError
      nil
    end

    def numeric(value)
      return if value.nil?
      return value if value.is_a?(Numeric)

      Float(value)
    rescue ArgumentError, TypeError
      nil
    end
  end
end
