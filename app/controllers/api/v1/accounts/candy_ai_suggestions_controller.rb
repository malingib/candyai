# frozen_string_literal: true

class Api::V1::Accounts::CandyAISuggestionsController < Api::V1::Accounts::BaseController
  def index
    suggestions = @current_account.candy_ai_suggestions.where(status: 'completed')
    suggestions = suggestions.where(conversation_id: params[:conversation_id]) if params[:conversation_id].present?

    render json: { suggestions: suggestions.order(created_at: :desc).limit(20) }
  end
end
