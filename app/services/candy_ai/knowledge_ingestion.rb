# frozen_string_literal: true

require 'ipaddr'
require 'net/http'
require 'resolv'
require 'uri'

module CandyAI
  class KnowledgeIngestion
    MAX_CONTENT_BYTES = 2.megabytes
    BLOCKED_NETWORKS = [
      IPAddr.new('127.0.0.0/8'),
      IPAddr.new('10.0.0.0/8'),
      IPAddr.new('172.16.0.0/12'),
      IPAddr.new('192.168.0.0/16'),
      IPAddr.new('169.254.0.0/16'),
      IPAddr.new('::1/128'),
      IPAddr.new('fc00::/7'),
      IPAddr.new('fe80::/10')
    ].freeze

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
      raise ArgumentError, 'a hostname is required' if uri.host.blank?
      raise ArgumentError, 'private or local network URLs are not allowed' if private_or_local_host?(uri.host)

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

    def self.private_or_local_host?(host)
      addresses = Resolv.getaddresses(host)
      addresses.any? do |address|
        ip = IPAddr.new(address)
        BLOCKED_NETWORKS.any? { |network| network.include?(ip) }
      rescue IPAddr::InvalidAddressError
        false
      end
    rescue Resolv::ResolvError
      true
    end
    private_class_method :private_or_local_host?
  end
end
