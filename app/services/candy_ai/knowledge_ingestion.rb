# frozen_string_literal: true

require 'uri'

module CandyAI
  class KnowledgeIngestion
    MAX_CONTENT_BYTES = 2.megabytes
    OPEN_TIMEOUT_SECONDS = 10
    READ_TIMEOUT_SECONDS = 20
    ALLOWED_CONTENT_TYPES = %w[application/json application/xhtml+xml].freeze

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

    # Use Chatwoot's SafeFetch implementation rather than Net::HTTP directly.
    # SafeFetch applies the platform's SSRF-aware resolver and redirect checks.
    def self.ingest_url(account:, url:, inbox: nil, title: nil, metadata: {})
      uri = validated_uri!(url)

      SafeFetch.fetch(
        uri.to_s,
        max_bytes: MAX_CONTENT_BYTES,
        open_timeout: OPEN_TIMEOUT_SECONDS,
        read_timeout: READ_TIMEOUT_SECONDS,
        allowed_content_type_prefixes: ['text/'],
        allowed_content_types: ALLOWED_CONTENT_TYPES
      ) do |result|
        content = result.tempfile.read.to_s
        content = ActionController::Base.helpers.strip_tags(content) if html_content_type?(result.content_type)

        ingest_text(
          account: account,
          inbox: inbox,
          title: title.presence || uri.host,
          content: content.strip,
          source_url: uri.to_s,
          metadata: metadata.merge('content_type' => result.content_type.to_s)
        )
      end
    rescue SafeFetch::FileTooLargeError
      raise ArgumentError, 'knowledge source is too large'
    rescue SafeFetch::InvalidUrlError, SafeFetch::UnsafeUrlError => e
      raise ArgumentError, "knowledge source URL is not allowed: #{e.class.name.demodulize}"
    rescue SafeFetch::Error => e
      Rails.logger.warn("[CandyAI] Knowledge source fetch failed: #{e.class}")
      raise ArgumentError, 'knowledge source could not be fetched'
    end

    def self.validated_uri!(url)
      uri = URI.parse(url.to_s)
      unless uri.is_a?(URI::HTTP) && uri.host.present?
        raise ArgumentError, 'only absolute HTTP(S) URLs are supported'
      end

      raise ArgumentError, 'URL credentials are not allowed' if uri.userinfo.present?
      raise ArgumentError, 'URL fragments are not allowed' if uri.fragment.present?

      expected_port = uri.scheme == 'https' ? 443 : 80
      raise ArgumentError, 'non-standard URL ports are not allowed' unless uri.port == expected_port

      uri
    rescue URI::InvalidURIError
      raise ArgumentError, 'invalid knowledge source URL'
    end
    private_class_method :validated_uri!

    def self.html_content_type?(content_type)
      content_type.to_s.downcase.include?('text/html') ||
        content_type.to_s.downcase.include?('application/xhtml+xml')
    end
    private_class_method :html_content_type?
  end
end
