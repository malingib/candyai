# frozen_string_literal: true

class Api::V1::Accounts::CandyAiSuggestionsController < Api::V1::Accounts::BaseController
  def index
    records = scoped_suggestions.visible
    records = records.where(conversation_id: conversation.id) if params[:conversation_id].present?
    render json: { suggestions: records.order(created_at: :desc).limit(20).map { |record| serialize(record) } }
  end

  def show
    render json: { suggestion: serialize(current_suggestion) }
  end

  def create
    return unless assist_enabled?

    record = CandyAI::Suggestion.request_for(source_message)
    CandyAI::GenerateSuggestionJob.perform_later(record.id) if record.status == 'pending'
    render json: { suggestion: serialize(record) }, status: :accepted
  end

  def update
    record = current_suggestion
    new_status = params.permit(:status, :content)[:status]
    unless record.generated? && %w[accepted rejected].include?(new_status)
      return render json: { error: 'Suggestion is no longer available' }, status: :unprocessable_entity
    end

    attributes = { status: new_status }
    if new_status == 'accepted'
      content = params.permit(:content)[:content].to_s.strip
      return render json: { error: 'Suggestion content cannot be blank' }, status: :unprocessable_entity if content.blank?

      attributes[:content] = content.first(12_000)
      attributes[:accepted_at] = Time.current
    else
      attributes[:rejected_at] = Time.current
    end
    record.update!(attributes)
    render json: { suggestion: serialize(record) }
  end

  def regenerate
    return unless assist_enabled?

    record = current_suggestion
    return render json: { error: 'Only a generated suggestion can be regenerated' }, status: :unprocessable_entity unless record.generated?

    record.update!(status: 'expired', expires_at: Time.current)
    replacement = CandyAI::Suggestion.request_for(source_message, source: 'regenerate')
    CandyAI::GenerateSuggestionJob.perform_later(replacement.id) if replacement.status == 'pending'
    render json: { suggestion: serialize(replacement) }, status: :accepted
  end

  private

  def scoped_suggestions
    CandyAI::Suggestion.where(account_id: @current_account.id)
  end

  def conversation
    @conversation ||= @current_account.conversations.find(params[:conversation_id])
  end

  def source_message
    @source_message ||= begin
      record = conversation.messages.find(params[:message_id]) if params[:message_id].present?
      record ||= conversation.messages.incoming.order(created_at: :desc).first
      raise ActiveRecord::RecordNotFound unless record&.incoming? && !record.private?
      raise ActiveRecord::RecordNotFound unless record.account_id == @current_account.id
      raise ActiveRecord::RecordNotFound unless record.inbox_id == conversation.inbox_id

      record
    end
  end

  def current_suggestion
    scoped_suggestions.find(params[:id])
  end

  def assist_enabled?
    config = CandyAI::AccountConfiguration.effective(source_message.inbox)
    return true if config['enabled'] == true && config['mode'] == 'assist'

    render json: { error: 'CandyAI Assist Mode is disabled for this inbox' }, status: :unprocessable_entity
    false
  end

  def serialize(record)
    record.attributes.slice(
      'id', 'account_id', 'inbox_id', 'conversation_id', 'message_id',
      'source', 'status', 'content', 'provider', 'model', 'failure_category',
      'error_message', 'context_metadata', 'generation_started_at',
      'generated_at', 'expires_at', 'accepted_at', 'rejected_at',
      'duration_ms', 'created_at', 'updated_at'
    )
  end
end

Api::V1::Accounts::CandyAISuggestionsController = Api::V1::Accounts::CandyAiSuggestionsController
