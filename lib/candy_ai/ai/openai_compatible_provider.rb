# frozen_string_literal: true

require 'net/http'
require 'json'
require 'uri'

# Adapter for OpenAI-compatible chat-completions APIs.
# Works with hosted and self-hosted endpoints that expose /chat/completions.
class CandyAI::AI::OpenAICompatibleProvider < Provider
  DEFAULT_BASE_URL = 'https://api.openai.com/v1'

  def chat(messages:, model: nil, temperature: nil, max_tokens: nil, **options)
    raise ArgumentError, 'messages must be an Array' unless messages.is_a?(Array)

    payload = {
      model: model || config.fetch(:model),
      messages: messages
    }
    payload[:temperature] = temperature unless temperature.nil?
    payload[:max_tokens] = max_tokens unless max_tokens.nil?
    payload.merge!(options)

    response = request(payload)
    choice = response.fetch('choices').first

    Response.new(
      text: choice.dig('message', 'content').to_s,
      model: response['model'] || payload[:model],
      provider: self.class.name,
      usage: response['usage'] || {},
      raw: response
    )
  end

  private

  def request(payload)
    parse_response(perform_request(payload))
  rescue JSON::ParserError => e
    raise "AI provider returned invalid JSON: #{e.message}"
  end

  def perform_request(payload)
    uri = URI.join(base_url.end_with?('/') ? base_url : "#{base_url}/", 'chat/completions')
    http_client(uri).request(build_http_request(uri, payload))
  end

  def build_http_request(uri, payload)
    request = Net::HTTP::Post.new(uri)
    request['Authorization'] = "Bearer #{api_key}" if api_key.present?
    request['Content-Type'] = 'application/json'
    request.body = JSON.generate(payload)
    request
  end

  def http_client(uri)
    Net::HTTP.new(uri.host, uri.port).tap do |http|
      http.use_ssl = uri.scheme == 'https'
      http.open_timeout = config.fetch(:open_timeout, 10)
      http.read_timeout = config.fetch(:read_timeout, 120)
    end
  end

  def parse_response(response)
    body = JSON.parse(response.body)
    return body if response.is_a?(Net::HTTPSuccess)

    message = body.dig('error', 'message') || response.message
    raise "AI provider request failed (#{response.code}): #{message}"
  end

  def base_url
    config.fetch(:base_url, DEFAULT_BASE_URL)
  end

  def api_key
    config[:api_key]
  end
end
