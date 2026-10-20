# frozen_string_literal: true

class Api::V1::Accounts::CandyAiKnowledgeDocumentsController < Api::V1::Accounts::BaseController
  before_action :authorize_account_update
  before_action :set_document, only: [:show, :update, :destroy, :archive, :refresh]

  def index
    documents = CandyAI::KnowledgeDocument.where(account: @current_account).order(updated_at: :desc)
    documents = documents.where(status: params[:status]) if CandyAI::KnowledgeDocument::STATUSES.include?(params[:status])
    render json: { payload: documents.limit(100).map { |document| serialize(document) } }
  end

  def show
    render json: { payload: serialize(@document) }
  end

  def create
    inbox = scoped_inbox(params[:inbox_id])
    document = if params[:url].present?
                 CandyAI::KnowledgeIngestion.ingest_url(
                   account: @current_account,
                   url: params[:url],
                   inbox: inbox,
                   title: params[:title],
                   metadata: {}
                 )
               else
                 CandyAI::KnowledgeIngestion.ingest_text(
                   account: @current_account,
                   title: params[:title],
                   content: params[:content],
                   inbox: inbox,
                   metadata: {}
                 )
               end
    render json: { payload: serialize(document) }, status: :created
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
    render json: { payload: serialize(refreshed) }
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

  def serialize(document)
    {
      id: document.id,
      inbox_id: document.inbox_id,
      title: document.title,
      source_type: document.source_type,
      source_url: document.source_url,
      content: document.content,
      status: document.status,
      metadata: document.metadata,
      last_ingested_at: document.last_ingested_at,
      created_at: document.created_at,
      updated_at: document.updated_at
    }
  end
end
