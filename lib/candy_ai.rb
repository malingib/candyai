# frozen_string_literal: true

# CandyAI application namespace.
#
# Keep CandyAI-specific code behind this namespace so the Chatwoot core remains
# easy to upgrade from upstream.
module CandyAI
  VERSION = '0.1.0'
  PRODUCT_NAME = 'CandyAI'
  COMPANY_NAME = 'MobiWave Innovations'

  class Configuration
    attr_accessor :enabled, :brand_name, :company_name, :default_ai_provider

    def initialize
      @enabled = true
      @brand_name = PRODUCT_NAME
      @company_name = COMPANY_NAME
      @default_ai_provider = nil
    end
  end

  class << self
    attr_writer :config

    def config
      @config ||= Configuration.new
    end
  end
end

require_relative 'candy_ai/ai'
