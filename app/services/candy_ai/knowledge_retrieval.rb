# frozen_string_literal: true

module CandyAI
  class KnowledgeRetrieval
    Result = Data.define(:document, :score)

    STOP_WORDS = %w[a an and are as at be by for from in is it of on or that the this to with].freeze

    def self.search(account:, query:, inbox: nil, limit: 6)
      new(account:, query:, inbox:, limit:).search
    end

    def initialize(account:, query:, inbox:, limit:)
      @account = account
      @query = query.to_s.downcase
      @inbox = inbox
      @limit = limit.clamp(1, 20)
    end

    def search
      terms = @query.scan(/[[:alnum:]_-]+/).reject { |term| term.length < 3 || STOP_WORDS.include?(term) }.uniq
      return [] if terms.empty?

      relation = KnowledgeDocument.active.where(account: @account)
      relation = relation.for_inbox(@inbox) if @inbox

      relation.filter_map do |document|
        score = score(document, terms)
        Result.new(document, score) if score.positive?
      end.sort_by { |result| -result.score }.first(@limit)
    end

    def context
      search.map do |result|
        doc = result.document
        "[#{doc.title}]\n#{doc.content.truncate(2_000)}"
      end.join("\n\n")
    end

    private

    def score(document, terms)
      haystack = "#{document.title} #{document.content}".downcase
      title = document.title.to_s.downcase
      terms.sum { |term| (title.scan(term).size * 3) + haystack.scan(term).size }
    end
  end
end
