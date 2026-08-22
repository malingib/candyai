# frozen_string_literal: true

class CandyAI::AI::Error < StandardError; end

class CandyAI::AI::ConfigurationError < CandyAI::AI::Error; end

class CandyAI::AI::ProviderError < CandyAI::AI::Error; end

class CandyAI::AI::AuthenticationError < CandyAI::AI::ProviderError; end

class CandyAI::AI::TimeoutError < CandyAI::AI::ProviderError; end

class CandyAI::AI::RateLimitError < CandyAI::AI::ProviderError; end

class CandyAI::AI::UpstreamError < CandyAI::AI::ProviderError; end

class CandyAI::AI::InvalidRequestError < CandyAI::AI::ProviderError; end

class CandyAI::AI::MalformedResponseError < CandyAI::AI::ProviderError; end

class CandyAI::AI::UnavailableError < CandyAI::AI::ProviderError; end
