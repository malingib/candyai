# frozen_string_literal: true

require "net/http"
require "json"
require "uri"

module CandyAI
  module AI
    # Adapter for OpenAI-compatible chat-completions APIs.
    # Works with hosted and self-hosted endpoints that expose /chat/completions.
    class OpenAICompatibleProvider < Provider
      DEFAULT_BASE_URL = "https://api.openai.com/v1"

      def chat(messages:, model: nil, temperature: nil, max_tokens: nil, **options)
        raise ArgumentError, "messages must be an Array" unless messages.is_a?(Array)

        payload = {
          model: model || config.fetch(:model),
          messages: messages
        }
        payload[:temperature] = temperature unless temperature.nil?
        payload[:max_tokens] = max_tokens unless max_tokens.nil?
        payload.merge!(options)

        response = request(payload)
        choice = response.fetch("choices").first

        Response.new(
          text: choice.dig("message", "content").to_s,
          model: response["model"] || payload[:model],
          provider: self.class.name,
          usage: response["usage"] || {},
          raw: response
        )
      end

      private

      def request(payload)
        uri = URI.join(base_url.end_with?("/") ? base_url : "#{base_url}/", "chat/completions")
        request = Net::HTTP::Post.new(uri)
        request["Authorization"] = "Bearer #{api_key}" if api_key && !api_key.empty?
        request["Content-Type"] = "application/json"
        request.body = JSON.generate(payload)

        http = Net::HTTP.new(uri.host, uri.port)
        http.use_ssl = uri.scheme == "https"
        http.open_timeout = config.fetch(:open_timeout, 10)
        http.read_timeout = config.fetch(:read_timeout, 120)

        response = http.request(request)
        body = JSON.parse(response.body)

        unless response.is_a?(Net::HTTPSuccess)
          message = body.dig("error", "message") || response.message
          raise RuntimeError, "AI provider request failed (#{response.code}): #{message}"
        end

        body
      rescue JSON::ParserError => e
        raise RuntimeError, "AI provider returned invalid JSON: #{e.message}"
      end

      def base_url
        config.fetch(:base_url, DEFAULT_BASE_URL)
      end

      def api_key
        config[:api_key]
      end
    end
  end
end
