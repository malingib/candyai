# frozen_string_literal: true

# Product identity for the unified CandyAI application.
#
# Chatwoot remains the internal Rails application namespace for now. This keeps
# the upstream application stable while the user-facing product identity is
# progressively moved to CandyAI / MobiWave.
module CandyAI
  module Brand
    NAME = 'CandyAI'
    COMPANY = 'MobiWave Innovations'
    PRODUCT_LINE = 'MobiWave AI'
    TAGLINE = 'AI-powered customer conversations and automation'

    WEBSITE_URL = ENV.fetch('CANDY_AI_WEBSITE_URL', 'https://mobiwaveai.co.ke')
    SUPPORT_EMAIL = ENV.fetch('CANDY_AI_SUPPORT_EMAIL', 'support@mobiwave.co.ke')

    # Keep a single source of truth for capabilities that are native to the
    # unified application. Feature-specific configuration lives elsewhere.
    CAPABILITIES = %w[
      omnichannel_inbox
      ai_assistance
      autonomous_ai
      knowledge_base
      lead_capture
      human_handoff
      analytics
      billing
    ].freeze
  end
end
