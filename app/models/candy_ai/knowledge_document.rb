# frozen_string_literal: true

module CandyAI
  class KnowledgeDocument < ApplicationRecord
    self.table_name = 'candy_ai_knowledge_documents'

    belongs_to :account
    belongs_to :inbox, optional: true

    SOURCES = %w[text url].freeze
    STATUSES = %w[active archived].freeze

    validates :title, :content, presence: true
    validates :source_type, inclusion: { in: SOURCES }
    validates :status, inclusion: { in: STATUSES }

    scope :active, -> { where(status: 'active') }
    scope :for_inbox, ->(inbox) { where(inbox: [nil, inbox]) }

    def archive!
      update!(status: 'archived')
    end
  end
end
