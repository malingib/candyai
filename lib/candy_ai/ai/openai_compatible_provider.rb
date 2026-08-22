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

      def initialize(config = {})
        super
        validate_endpoint!
      end

      def chat(messages:, model: nil, temperature: nil, max_tokens: nil, **options)
        raise ArgumentError, "messages must be an Array" unless messages.is_a?(Array)

        selected_model = model || config[:model]
        raise ConfigurationError, 'AI provider model is not configured' if selected_model.nil? || selected_model.to_s.empty?

        validate_credentials!
        payload = {
          model: selected_model,
          messages: messages
        }
        payload[:temperature] = temperature unless temperature.nil?
        payload[:max_tokens] = max_tokens unless max_tokens.nil?
        payload.merge!(options)

        response = request(payload)
        choice = response.fetch("choices").first
        raise MalformedResponseError, 'AI provider returned no response choices' if choice.nil?

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

        raise_error_for_status(response) unless response.is_a?(Net::HTTPSuccess)

        body
      rescue JSON::ParserError => e
        raise MalformedResponseError, "AI provider returned invalid JSON: #{e.message}"
      rescue Net::OpenTimeout, Net::ReadTimeout
        raise TimeoutError, 'AI provider request timed out'
      rescue SocketError, SystemCallError
        raise UnavailableError, 'AI provider is unavailable'
      end

      def raise_error_for_status(response)
        error_class = case response.code.to_i
                      when 401, 403 then AuthenticationError
                      when 400, 422 then InvalidRequestError
                      when 429 then RateLimitError
                      when 500..599 then UpstreamError
                      else ProviderError
                      end

        raise error_class, "AI provider request failed (#{response.code})"
      end

      def validate_endpoint!
        uri = URI.parse(base_url)
        valid_scheme = uri.scheme == 'https' || (uri.scheme == 'http' && config[:allow_insecure_http] == true)
        invalid = !valid_scheme || uri.host.nil? || uri.host.empty? || uri.userinfo
        raise ConfigurationError, 'AI provider endpoint must be an HTTPS URL' if invalid
      rescue URI::InvalidURIError
        raise ConfigurationError, 'AI provider endpoint is invalid'
      end

      def validate_credentials!
        return if (api_key && !api_key.empty?) || custom_endpoint?

        raise ConfigurationError, 'AI provider API credentials are not configured'
      end

      def custom_endpoint?
        base_url != DEFAULT_BASE_URL
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
