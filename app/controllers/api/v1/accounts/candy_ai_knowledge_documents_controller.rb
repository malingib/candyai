# frozen_string_literal: true

class Api::V1::Accounts::CandyAiKnowledgeDocumentsController < Api::V1::Accounts::BaseController
  before_action :authorize_account_update
  before_action :set_document, only: [:show, :update, :destroy, :archive, :refresh]

  def index
    documents = CandyAI::KnowledgeDocument.where(account: @current_account).order(updated_at: :desc)
    documents = documents.where(status: params[:status]) if CandyAI::KnowledgeDocument::STATUSES.include?(params[:status])
    render json: { payload: documents.limit(100).map { |document| serialize(document, include_content: false) } }
  end

  def show
    render json: { payload: serialize(@document, include_content: true) }
  end

  def create
    document = create_document(scoped_inbox(params[:inbox_id]))
    render json: { payload: serialize(document, include_content: true) }, status: :created
  rescue ArgumentError, ActiveRecord::RecordInvalid, ActiveRecord::RecordNotFound => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

  def update
    attributes = params.permit(:title, :content, :inbox_id).to_h
    attributes[:inbox] = scoped_inbox(attributes.delete('inbox_id')) if attributes.key?('inbox_id')
    @document.update!(attributes)
    render json: { payload: serialize(@document) }
  rescue ActiveRecord::RecordInvalid, ActiveRecord::RecordNotFound => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

  def archive
    @document.archive!
    render json: { payload: serialize(@document) }
  end

  def refresh
    raise ArgumentError, 'only URL sources can be refreshed' unless @document.source_type == 'url'

    refreshed = CandyAI::KnowledgeIngestion.ingest_url(
      account: @current_account,
      url: @document.source_url,
      inbox: @document.inbox,
      title: @document.title,
      metadata: @document.metadata || {}
    )
    @document.archive!
    render json: { payload: serialize(refreshed, include_content: true) }
  rescue ArgumentError, ActiveRecord::RecordInvalid => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

  def destroy
    @document.destroy!
    head :no_content
  end

  private

  def authorize_account_update
    authorize @current_account, :update?
  end

  def set_document
    @document = CandyAI::KnowledgeDocument.where(account: @current_account).find(params[:id])
  end

  def scoped_inbox(inbox_id)
    return nil if inbox_id.blank?

    @current_account.inboxes.find(inbox_id)
  end

  def create_document(inbox)
    common = { account: @current_account, inbox: inbox, title: params[:title], metadata: {} }
    if params[:url].present?
      CandyAI::KnowledgeIngestion.ingest_url(**common, url: params[:url])
    else
      CandyAI::KnowledgeIngestion.ingest_text(**common, content: params[:content])
    end
  end

  def serialize(document, include_content: false)
    payload = {
      id: document.id,
      inbox_id: document.inbox_id,
      title: document.title,
      source_type: document.source_type,
      source_url: document.source_url,
      status: document.status,
      metadata: document.metadata,
      last_ingested_at: document.last_ingested_at,
      created_at: document.created_at,
      updated_at: document.updated_at
    }
    payload[:content] = document.content if include_content
    payload
  end
end
