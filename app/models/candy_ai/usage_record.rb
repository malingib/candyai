# frozen_string_literal: true

module CandyAI
  class UsageRecord < ApplicationRecord
    self.table_name = 'candy_ai_usage_records'

    belongs_to :account
    belongs_to :inbox, optional: true
    belongs_to :conversation, optional: true
    belongs_to :suggestion, class_name: 'CandyAI::Suggestion', optional: true

    validates :account, presence: true
    validates :requested_at, presence: true
    validates :success, inclusion: { in: [true, false] }

    scope :for_account, ->(account) { where(account: account) }
    scope :successful, -> { where(success: true) }
  end
end
