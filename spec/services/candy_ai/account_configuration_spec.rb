# frozen_string_literal: true

require 'rails_helper'

RSpec.describe CandyAI::AccountConfiguration do
  describe '.account' do
    it 'merges persisted account settings over defaults' do
      account = build(:account, settings: { 'candy_ai' => { 'enabled' => true, 'model' => 'test-model' } })

      configuration = described_class.account(account)

      expect(configuration['enabled']).to be(true)
      expect(configuration['model']).to eq('test-model')
      expect(configuration['handoff_enabled']).to be(true)
    end
  end

  describe '.normalize' do
    it 'clamps generation limits' do
      configuration = described_class.normalize(
        'temperature' => 99,
        'max_tokens' => 999_999,
        'enabled' => 'true'
      )

      expect(configuration['temperature']).to eq(2.0)
      expect(configuration['max_tokens']).to eq(16_384)
      expect(configuration['enabled']).to be(true)
    end
  end

  describe '.normalize_inbox' do
    it 'falls back to assist for an unknown mode' do
      configuration = described_class.normalize_inbox('mode' => 'invalid')

      expect(configuration['mode']).to eq('assist')
    end
  end
end
