# frozen_string_literal: true

class CandyAI::Suggestion < ApplicationRecord
  self.table_name = 'candy_ai_suggestions'

  STATUSES = %w[pending generating generated accepted rejected expired failed].freeze
  ACTIVE_STATUSES = %w[pending generating].freeze
  TERMINAL_STATUSES = %w[accepted rejected expired failed].freeze

  belongs_to :account
  belongs_to :inbox
  belongs_to :conversation
  belongs_to :message

  validates :status, inclusion: { in: STATUSES }
  validates :content, presence: true, if: :content_required?
  validates :source, presence: true

  scope :active, -> { where(status: ACTIVE_STATUSES) }
  scope :visible, -> { where(status: %w[generated accepted rejected]) }

  def generated?
    status == 'generated'
  end

  def pending?
    status == 'pending'
  end

  def terminal?
    TERMINAL_STATUSES.include?(status)
  end

  def content_required?
    %w[generated accepted].include?(status)
  end

  def self.request_for(message, source: 'message_created')
    active.find_or_create_by!(message_id: message.id) do |suggestion|
      suggestion.account = message.account
      suggestion.inbox = message.inbox
      suggestion.conversation = message.conversation
      suggestion.source = source
      suggestion.status = 'pending'
    end
  end
end
