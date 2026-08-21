# frozen_string_literal: true

# CandyAI is kept isolated from the upstream Chatwoot routes so the feature can
# be removed or upstreamed without editing the large generated routes file.
Rails.application.routes.append do
  get '/api/v1/accounts/:account_id/candy_ai',
      to: 'api/v1/accounts/candy_ai#show'
  put '/api/v1/accounts/:account_id/candy_ai',
      to: 'api/v1/accounts/candy_ai#update'
end
