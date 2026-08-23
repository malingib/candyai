# frozen_string_literal: true

require 'rails_helper'

RSpec.describe CandyAI::AI::Router do
  let(:registry) { instance_double(CandyAI::AI::ProviderRegistry) }
  let(:primary) { instance_spy(CandyAI::AI::Provider) }
  let(:fallback) { instance_spy(CandyAI::AI::Provider) }
  let(:router) { described_class.new(registry: registry, default_provider: 'openai', fallback_provider: 'gemini') }

  before do
    allow(registry).to receive(:fetch).with('openai').and_return(primary)
    allow(registry).to receive(:fetch).with('gemini').and_return(fallback)
  end

  it 'uses the configured default provider when none is given' do
    expect(primary).to receive(:chat).with(hash_including(messages: [{ role: 'user', content: 'hi' }], model: nil))
    router.chat(messages: [{ role: 'user', content: 'hi' }])
  end

  it 'honors an explicit provider and model' do
    expect(primary).to receive(:chat).with(hash_including(model: 'gpt-x'))
    router.chat(messages: [], provider: 'openai', model: 'gpt-x')
  end

  it 'prepends a system prompt when supplied' do
    expect(primary).to receive(:chat) do |**kwargs|
      expect(kwargs[:messages].first).to eq(role: 'system', content: 'be safe')
    end
    router.chat(messages: [{ role: 'user', content: 'hi' }], system: 'be safe')
  end

  it 'does not silently fall back when fallback is not enabled' do
    allow(primary).to receive(:chat).and_raise(CandyAI::AI::TimeoutError, 'timed out')

    expect { router.chat(messages: [], provider: 'openai') }.to raise_error(CandyAI::AI::TimeoutError)
    expect(fallback).not_to have_received(:chat)
  end

  it 'falls back explicitly when fallback: true' do
    allow(primary).to receive(:chat).and_raise(CandyAI::AI::RateLimitError, 'rate')
    expect(fallback).to receive(:chat).and_return(:ok)

    expect(router.chat(messages: [], provider: 'openai', fallback: true)).to eq(:ok)
  end

  it 'raises when no provider is configured' do
    allow(registry).to receive(:fetch).and_return(primary)
    router = described_class.new(registry: registry, default_provider: nil)

    expect { router.chat(messages: []) }.to raise_error(ArgumentError, /No CandyAI AI provider configured/)
  end
end
