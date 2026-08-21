# frozen_string_literal: true

require Rails.root.join('lib/candy_ai')

Rails.application.config.x.candy_ai = CandyAI::Configuration.new
CandyAI.config = Rails.application.config.x.candy_ai

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
    api_key: ENV['CANDYAI_AI_API_KEY'],
    base_url: ENV.fetch('CANDYAI_AI_BASE_URL', nil),
    model: ENV['CANDYAI_AI_MODEL']
  )

  CandyAI.config.default_ai_provider = provider_name
end

Rails.application.config.to_prepare do
  Account.define_method(:candy_ai_configuration) do
    CandyAI::AccountConfiguration.account(self)
  end unless Account.method_defined?(:candy_ai_configuration)

  Account.define_method(:candy_ai_enabled?) do
    candy_ai_configuration['enabled'] == true
  end unless Account.method_defined?(:candy_ai_enabled?)
end

Rails.application.routes.append do
  namespace :api, defaults: { format: 'json' } do
    namespace :v1 do
      resources :accounts, only: [] do
        resource :candy_ai, only: [:show, :update], controller: 'accounts/candy_ai'
        resources :candy_ai_inboxes, only: [:show, :update], controller: 'accounts/candy_ai_inboxes', param: :inbox_id
      end
    end
  end
end
