# frozen_string_literal: true

require Rails.root.join('lib/candy_ai')

candy_ai_config = CandyAI::Configuration.new
Rails.application.config.x[:candy_ai] = candy_ai_config
CandyAI.config = candy_ai_config

CandyAI.config.enabled =
  ActiveModel::Type::Boolean.new.cast(ENV.fetch('CANDYAI_ENABLED', 'true'))

CandyAI.config.brand_name =
  ENV.fetch('CANDYAI_BRAND_NAME', CandyAI::PRODUCT_NAME)

CandyAI.config.company_name =
  ENV.fetch('CANDYAI_COMPANY_NAME', CandyAI::COMPANY_NAME)

CandyAI.config.default_ai_provider =
  ENV['CANDYAI_DEFAULT_AI_PROVIDER'].presence

if ENV['CANDYAI_AI_API_KEY'].present? && ENV['CANDYAI_AI_MODEL'].present?
  provider_name = CandyAI.config.default_ai_provider || 'default'

  CandyAI::AI.register_openai_compatible(
    name: provider_name,
    api_key: ENV.fetch('CANDYAI_AI_API_KEY', nil),
    base_url: ENV.fetch('CANDYAI_AI_BASE_URL', nil),
    model: ENV.fetch('CANDYAI_AI_MODEL', nil)
  )

  CandyAI.config.default_ai_provider = provider_name

  # OpenRouter and MobiWave-hosted inference are OpenAI-compatible endpoints.
  # Register them under friendly names when configured so routing can target them.
  if ENV['CANDYAI_OPENROUTER_API_KEY'].present? && ENV['CANDYAI_OPENROUTER_MODEL'].present?
    CandyAI::AI.register_openai_compatible(
      name: 'openrouter',
      api_key: ENV.fetch('CANDYAI_OPENROUTER_API_KEY', nil),
      base_url: ENV.fetch('CANDYAI_OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1'),
      model: ENV.fetch('CANDYAI_OPENROUTER_MODEL', nil)
    )
  end

  if ENV['CANDYAI_MOBIWAVE_API_KEY'].present? && ENV['CANDYAI_MOBIWAVE_MODEL'].present?
    CandyAI::AI.register_openai_compatible(
      name: 'mobiwave',
      api_key: ENV.fetch('CANDYAI_MOBIWAVE_API_KEY', nil),
      base_url: ENV.fetch('CANDYAI_MOBIWAVE_BASE_URL', 'https://inference.mobiwave.test/v1'),
      model: ENV.fetch('CANDYAI_MOBIWAVE_MODEL', nil)
    )
  end
end

Rails.application.config.to_prepare do
  unless Account.method_defined?(:candy_ai_configuration)
    Account.define_method(:candy_ai_configuration) do
      CandyAI::AccountConfiguration.account(self)
    end
  end

  unless Account.method_defined?(:candy_ai_enabled?)
    Account.define_method(:candy_ai_enabled?) do
      candy_ai_configuration['enabled'] == true
    end
  end
end
