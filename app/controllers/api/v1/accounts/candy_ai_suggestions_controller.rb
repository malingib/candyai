# frozen_string_literal: true

class Api::V1::Accounts::CandyAiSuggestionsController < Api::V1::Accounts::BaseController
  def index
    suggestions = @current_account.candy_ai_suggestions.visible
    suggestions = suggestions.where(conversation_id: conversation.id) if params[:conversation_id].present?

    render json: { suggestions: suggestions.order(created_at: :desc).limit(20).map { |suggestion| serialize(suggestion) } }
  end

  def show
    render json: { suggestion: serialize(suggestion) }
  end

  def create
    return unless ensure_assist_enabled!

    suggestion = CandyAI::Suggestion.request_for(source_message)
    CandyAI::GenerateSuggestionJob.perform_later(suggestion.id) if suggestion.pending?

    render json: { suggestion: serialize(suggestion) }, status: :accepted
  end

  def update
    suggestion = current_suggestion
    status = suggestion_params[:status]

    unless %w[accepted rejected].include?(status) && suggestion.generated?
      return render json: { error: 'Suggestion is no longer available' }, status: :unprocessable_entity
    end

    attributes = { status: status }
    attributes[:content] = suggestion_params[:content] if status == 'accepted' && suggestion_params[:content].present?
    attributes[status == 'accepted' ? :accepted_at : :rejected_at] = Time.current
    suggestion.update!(attributes)

    render json: { suggestion: serialize(suggestion) }
  end

  def regenerate
    return unless ensure_assist_enabled!

    current_suggestion.update!(status: 'expired') if current_suggestion.generated?
    suggestion = CandyAI::Suggestion.request_for(source_message, source: 'regenerate')
    CandyAI::GenerateSuggestionJob.perform_later(suggestion.id)

    render json: { suggestion: serialize(suggestion) }, status: :accepted
  end

  private

  def conversation
    @conversation ||= @current_account.conversations.find(params[:conversation_id])
  end

  def source_message
    @source_message ||= begin
      message = if params[:message_id].present?
                  conversation.messages.find(params[:message_id])
                else
                  conversation.messages.incoming.order(created_at: :desc).first
                end
      raise ActiveRecord::RecordNotFound unless message&.account_id == @current_account.id && message.inbox_id == conversation.inbox_id

      message
    end
  end

  def current_suggestion
    @current_suggestion ||= @current_account.candy_ai_suggestions.find(params[:id])
  end

  def suggestion
    @suggestion ||= @current_account.candy_ai_suggestions.find(params[:id])
  end

  def ensure_assist_enabled!
    configuration = CandyAI::ConfigurationResolver.for(account: source_message.account, inbox: source_message.inbox)
    return true if configuration['enabled'] == true && configuration['assist_enabled'] == true

    if !CandyAI.config.enabled?
      render json: { error: 'CandyAI is disabled' }, status: :unprocessable_entity
    elsif configuration['enabled'] != true
      render json: { error: 'CandyAI Assist Mode is disabled' }, status: :unprocessable_entity
    elsif configuration['autonomous_enabled'] == true
      render json: { error: 'CandyAI Assist Mode is not available for autonomous inboxes' }, status: :unprocessable_entity
    else
      render json: { error: 'CandyAI Assist Mode is disabled' }, status: :unprocessable_entity
    end

    false
  end

  def suggestion_params
    params.permit(:status, :content)
  end

  def serialize(record)
    record.attributes.slice(
      'id', 'account_id', 'inbox_id', 'conversation_id', 'message_id', 'source', 'status',
      'content', 'provider', 'model', 'usage', 'failure_category', 'error_message',
      'intelligence', 'quality_status',
      'request_id', 'generation_started_at', 'generated_at', 'expires_at', 'accepted_at',
      'rejected_at', 'duration_ms', 'created_at', 'updated_at'
    )
  end
end

Api::V1::Accounts::CandyAISuggestionsController = Api::V1::Accounts::CandyAiSuggestionsController
