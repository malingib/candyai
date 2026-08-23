# frozen_string_literal: true

require 'rails_helper'

RSpec.describe CandyAI::SuggestionQuality do
  def response_with(text)
    CandyAI::AI::Response.new(text: text, provider: 'p', model: 'm')
  end

  it 'accepts a normal response' do
    quality = described_class.new(response_with('Please reset via settings.'))

    expect(quality).to be_valid
    expect(quality.status).to eq('pass')
  end

  it 'rejects an empty response' do
    quality = described_class.new(response_with(''))

    expect(quality).not_to be_valid
    expect(quality.failures).to include('empty_response')
  end

  it 'rejects an oversized response' do
    quality = described_class.new(response_with('x' * (described_class::MAX_CONTENT_LENGTH + 1)))

    expect(quality).not_to be_valid
    expect(quality.failures).to include('oversized_response')
  end

  it 'rejects leaked provider secrets' do
    quality = described_class.new(response_with("Here is your key sk-#{('a' * 25)}"))

    expect(quality).not_to be_valid
    expect(quality.failures).to include('secret_leakage')
  end

  it 'rejects leaked system prompts' do
    quality = described_class.new(response_with('System prompt: you are candyai, hard rules apply'))

    expect(quality).not_to be_valid
    expect(quality.failures).to include('system_prompt_leakage')
  end

  it 'rejects structurally invalid responses' do
    quality = described_class.new(Object.new)

    expect(quality).not_to be_valid
    expect(quality.failures).to include('invalid_structure')
  end
end
