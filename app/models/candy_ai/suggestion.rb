# frozen_string_literal: true

class CandyAI::Suggestion < ApplicationRecord
  self.table_name = 'candy_ai_suggestions'

  STATUSES = %w[pending generating generated accepted rejected expired failed].freeze
  ACTIVE_STATUSES = %w[pending generating].freeze
  VISIBLE_STATUSES = %w[generated accepted rejected].freeze

  belongs_to :account
  belongs_to :inbox
  belongs_to :conversation
  belongs_to :message

  validates :status, inclusion: { in: STATUSES }
  validates :source, presence: true
  validates :content, presence: true, if: -> { %w[generated accepted].include?(status) }

  scope :active, -> { where(status: ACTIVE_STATUSES) }
  scope :visible, -> { where(status: VISIBLE_STATUSES) }

  def generated?
    status == 'generated'
  end

  def self.request_for(message, source: 'message_created')
    active.find_or_create_by!(message_id: message.id) do |record|
      record.account = message.account
      record.inbox = message.inbox
      record.conversation = message.conversation
      record.source = source
    end
  rescue ActiveRecord::RecordNotUnique
    active.find_by!(message_id: message.id)
  end
end
