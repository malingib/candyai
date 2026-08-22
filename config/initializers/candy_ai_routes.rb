# frozen_string_literal: true

# CandyAI is kept isolated from the upstream Chatwoot routes so the feature can
# be removed or upstreamed without editing the large generated routes file.
Rails.application.routes.append do
  namespace :api, defaults: { format: 'json' } do
    namespace :v1 do
      resources :accounts, only: [] do
        resource :candy_ai, only: [:show, :update], controller: 'accounts/candy_ai'
        resources :candy_ai_inboxes, only: [:show, :update], controller: 'accounts/candy_ai_inboxes', param: :inbox_id
        resources :candy_ai_suggestions, only: [:index], controller: 'accounts/candy_ai_suggestions'
      end
    end
  end
end
