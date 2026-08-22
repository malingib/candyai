# frozen_string_literal: true

class CandyAI::Suggestion < ApplicationRecord
  STATUSES = %w[completed failed dismissed].freeze

  belongs_to :account
  belongs_to :inbox
  belongs_to :conversation
  belongs_to :message

  validates :status, inclusion: { in: STATUSES }
  validates :content, presence: true, if: :completed?

  def completed?
    status == 'completed'
  end
end
