# frozen_string_literal: true

require 'net/http'
require 'uri'

module CandyAI
  class KnowledgeIngestion
    MAX_CONTENT_BYTES = 2.megabytes

    def self.ingest_text(account:, title:, content:, inbox: nil, source_url: nil, metadata: {})
      raise ArgumentError, 'content is required' if content.blank?
      raise ArgumentError, 'content is too large' if content.bytesize > MAX_CONTENT_BYTES

      KnowledgeDocument.create!(
        account: account,
        inbox: inbox,
        source_type: source_url.present? ? 'url' : 'text',
        source_url: source_url,
        title: title.presence || 'Untitled document',
        content: content,
        metadata: metadata,
        status: 'active',
        last_ingested_at: Time.current
      )
    end

    def self.ingest_url(account:, url:, inbox: nil, title: nil, metadata: {})
      uri = URI.parse(url)
      raise ArgumentError, 'only HTTP(S) URLs are supported' unless %w[http https].include?(uri.scheme)

      response = Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == 'https', open_timeout: 10, read_timeout: 20) do |http|
        http.get(uri.request_uri, { 'User-Agent' => 'CandyAI-KnowledgeBot/1.0' })
      end

      raise "knowledge source returned HTTP #{response.code}" unless response.is_a?(Net::HTTPSuccess)
      raise ArgumentError, 'knowledge source is too large' if response.body.to_s.bytesize > MAX_CONTENT_BYTES

      body = response.body.to_s
      body = ActionController::Base.helpers.strip_tags(body) if response['content-type'].to_s.include?('html')

      ingest_text(
        account: account,
        inbox: inbox,
        title: title.presence || uri.host,
        content: body.strip,
        source_url: url,
        metadata: metadata.merge('content_type' => response['content-type'])
      )
    end
  end
end
