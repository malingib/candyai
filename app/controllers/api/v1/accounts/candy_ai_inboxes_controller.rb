# frozen_string_literal: true

class Api::V1::Accounts::CandyAiInboxesController < Api::V1::Accounts::BaseController
  before_action :set_inbox
  before_action :authorize_account_update

  def show
    render json: {
      inbox_id: @inbox.id,
      settings: CandyAI::AccountConfiguration.inbox(@inbox),
      effective: CandyAI::AccountConfiguration.effective(@inbox)
    }
  end

  def update
    settings = CandyAI::AccountConfiguration.inbox(@inbox).merge(
      CandyAI::AccountConfiguration.normalize_inbox(candy_ai_params)
    )
    @inbox.update!(candy_ai_settings: settings)

    render json: {
      inbox_id: @inbox.id,
      settings: settings,
      effective: CandyAI::AccountConfiguration.effective(@inbox)
    }
  end

  private

  def set_inbox
    @inbox = @current_account.inboxes.find(params[:inbox_id])
  end

  def authorize_account_update
    authorize @current_account, :update?
  end

  def candy_ai_params
    params.require(:settings).permit(
      :enabled, :mode, :provider, :model, :system_prompt,
      :handoff_enabled, :handoff_message
    )
  end
end
