# frozen_string_literal: true

require Rails.root.join('lib/candy_ai')

Rails.application.config.x.candy_ai = CandyAI::Configuration.new

Rails.application.config.x.candy_ai.enabled =
  ActiveModel::Type::Boolean.new.cast(ENV.fetch('CANDYAI_ENABLED', 'true'))

Rails.application.config.x.candy_ai.brand_name =
  ENV.fetch('CANDYAI_BRAND_NAME', CandyAI::PRODUCT_NAME)

Rails.application.config.x.candy_ai.company_name =
  ENV.fetch('CANDYAI_COMPANY_NAME', CandyAI::COMPANY_NAME)

Rails.application.config.x.candy_ai.default_ai_provider =
  ENV['CANDYAI_DEFAULT_AI_PROVIDER'].presence

if ENV['CANDYAI_AI_API_KEY'].present? && ENV['CANDYAI_AI_MODEL'].present?
  provider_name = Rails.application.config.x.candy_ai.default_ai_provider || 'default'

  CandyAI::AI.register_openai_compatible(
    name: provider_name,
    api_key: ENV['CANDYAI_AI_API_KEY'],
    base_url: ENV.fetch('CANDYAI_AI_BASE_URL', nil),
    model: ENV['CANDYAI_AI_MODEL']
  )

  Rails.application.config.x.candy_ai.default_ai_provider = provider_name
end
