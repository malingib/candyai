# frozen_string_literal: true

module CandyAI
  class GroundingContext
    def self.for(account:, conversation:, inbox: nil, query: nil, limit: 6)
      new(account:, conversation:, inbox:, query:, limit:).for_prompt
    end

    def initialize(account:, conversation:, inbox:, query:, limit:)
      @account = account
      @conversation = conversation
      @inbox = inbox
      @query = query.presence || latest_message
      @limit = limit
    end

    def for_prompt
      return '' if @query.blank?

      context = KnowledgeRetrieval.new(
        account: @account,
        query: @query,
        inbox: @inbox,
        limit: @limit
      ).context

      return '' if context.blank?

      <<~CONTEXT
        Use the following CandyAI knowledge only when it is relevant to the customer's question.
        If the knowledge does not answer the question, do not invent facts.

        KNOWLEDGE:
        #{context}
      CONTEXT
    end

    private

    def latest_message
      @conversation.messages.incoming.order(created_at: :desc).first&.content_for_llm
    end
  end
end
