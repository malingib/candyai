# frozen_string_literal: true

class Api::V1::Accounts::CandyAiController < Api::V1::Accounts::BaseController
  before_action :authorize_account_update, only: [:update]

  def show
    render json: { settings: CandyAI::AccountConfiguration.account(@current_account) }
  end

  def update
    current = CandyAI::AccountConfiguration.account(@current_account)
    @current_account.settings = (@current_account.settings || {}).merge('candy_ai' => current.merge(CandyAI::AccountConfiguration.normalize(candy_ai_params)))
    @current_account.save!
    render json: { settings: CandyAI::AccountConfiguration.account(@current_account) }
  end

  private

  def authorize_account_update
    authorize @current_account, :update?
  end

  def candy_ai_params
    params.require(:settings).permit(
      :enabled, :provider, :model, :system_prompt, :temperature, :max_tokens,
      :handoff_enabled, :handoff_message
    )
  end
end
