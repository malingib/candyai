# frozen_string_literal: true

# CandyAI routes are isolated from the upstream Chatwoot routes.
Rails.application.routes.append do
  get '/api/v1/accounts/:account_id/candy_ai',
      to: 'api/v1/accounts/candy_ai#show'
  put '/api/v1/accounts/:account_id/candy_ai',
      to: 'api/v1/accounts/candy_ai#update'

  get '/api/v1/accounts/:account_id/candy_ai/knowledge_documents',
      to: 'api/v1/accounts/candy_ai_knowledge_documents#index'
  post '/api/v1/accounts/:account_id/candy_ai/knowledge_documents',
       to: 'api/v1/accounts/candy_ai_knowledge_documents#create'
  get '/api/v1/accounts/:account_id/candy_ai/knowledge_documents/:id',
      to: 'api/v1/accounts/candy_ai_knowledge_documents#show'
  patch '/api/v1/accounts/:account_id/candy_ai/knowledge_documents/:id',
        to: 'api/v1/accounts/candy_ai_knowledge_documents#update'
  put '/api/v1/accounts/:account_id/candy_ai/knowledge_documents/:id',
      to: 'api/v1/accounts/candy_ai_knowledge_documents#update'
  post '/api/v1/accounts/:account_id/candy_ai/knowledge_documents/:id/archive',
       to: 'api/v1/accounts/candy_ai_knowledge_documents#archive'
  post '/api/v1/accounts/:account_id/candy_ai/knowledge_documents/:id/refresh',
       to: 'api/v1/accounts/candy_ai_knowledge_documents#refresh'
  delete '/api/v1/accounts/:account_id/candy_ai/knowledge_documents/:id',
         to: 'api/v1/accounts/candy_ai_knowledge_documents#destroy'

  get '/api/v1/accounts/:account_id/candy_ai_suggestions',
      to: 'api/v1/accounts/candy_ai_suggestions#index'
  post '/api/v1/accounts/:account_id/candy_ai_suggestions',
       to: 'api/v1/accounts/candy_ai_suggestions#create'
  get '/api/v1/accounts/:account_id/candy_ai_suggestions/:id',
      to: 'api/v1/accounts/candy_ai_suggestions#show'
  patch '/api/v1/accounts/:account_id/candy_ai_suggestions/:id',
        to: 'api/v1/accounts/candy_ai_suggestions#update'
  post '/api/v1/accounts/:account_id/candy_ai_suggestions/:id/regenerate',
       to: 'api/v1/accounts/candy_ai_suggestions#regenerate'
end
