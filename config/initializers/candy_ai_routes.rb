# frozen_string_literal: true

# CandyAI is kept isolated from the upstream Chatwoot routes so the feature can
# be removed or upstreamed without editing the large generated routes file.
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
end
