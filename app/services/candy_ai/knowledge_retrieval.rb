# frozen_string_literal: true

class CandyAI::KnowledgeRetrieval
  Result = Data.define(:document, :score)

  STOP_WORDS = %w[a an and are as at be by for from in is it of on or that the this to with].freeze
  MAX_CONTEXT_CHARS = 12_000
  MAX_DOCUMENT_CHARS = 2_000

  def self.search(account:, query:, inbox: nil, limit: 6)
    new(account: account, query: query, inbox: inbox, limit: limit).search
  end

  def initialize(account:, query:, inbox:, limit:)
    @account = account
    @query = query.to_s.downcase
    @inbox = inbox
    @limit = limit.clamp(1, 20)
  end

  def search
    terms = search_terms
    return [] if terms.empty?

    ranked_results = searchable_documents.filter_map do |document|
      score = score(document, terms)
      Result.new(document, score) if score.positive?
    end
    ranked_results.sort_by { |result| -result.score }.first(@limit)
  end

  # Add stable source labels so the model can cite grounded material. The
  # content is explicitly marked as untrusted data by GroundingContext.
  def context
    output = []
    used_chars = 0

    search.each_with_index do |result, index|
      document = result.document
      source_number = index + 1
      source_url = document.source_url.to_s.presence
      excerpt = document.content.to_s.truncate(MAX_DOCUMENT_CHARS)
      entry = "[Source #{source_number}: #{document.title}]"
      entry += "\nURL: #{source_url}" if source_url
      entry += "\n#{excerpt}"
      break if used_chars + entry.length > MAX_CONTEXT_CHARS

      output << entry
      used_chars += entry.length + 2
    end

    output.join("\n\n")
  end

  private

  def search_terms
    @query.scan(/[[:alnum:]_-]+/).reject { |term| term.length < 3 || STOP_WORDS.include?(term) }.uniq
  end

  def searchable_documents
    relation = CandyAI::KnowledgeDocument.active.where(account: @account)
    @inbox ? relation.for_inbox(@inbox) : relation
  end

  def score(document, terms)
    haystack = "#{document.title} #{document.content}".downcase
    title = document.title.to_s.downcase
    terms.sum { |term| (title.scan(term).size * 3) + haystack.scan(term).size }
  end
end
