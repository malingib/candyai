# frozen_string_literal: true

require 'rails_helper'

RSpec.describe CandyAI::ConfigurationResolver do
  let(:account) { create(:account) }
  let(:inbox) { create(:inbox, account: account) }

  describe '.for' do
    it 'returns a deterministic effective schema' do
      allow(CandyAI).to receive(:config).and_return(
        instance_double(CandyAI::Configuration, enabled?: true, default_ai_provider: 'openai')
      )
      account.update!(settings: { 'candy_ai' => { 'enabled' => true, 'provider' => 'openai', 'model' => 'a-model' } })
      inbox.update!(candy_ai_settings: { 'enabled' => true, 'mode' => 'assist' })

      result = described_class.for(account: account, inbox: inbox)

      expect(result).to include(
        'enabled' => true,
        'assist_enabled' => true,
        'autonomous_enabled' => false,
        'provider' => 'openai',
        'model' => 'a-model',
        'mode' => 'assist'
      )
      expect(result).to be_frozen
    end

    it 'applies global kill switch' do
      allow(CandyAI).to receive(:config).and_return(
        instance_double(CandyAI::Configuration, enabled?: false, default_ai_provider: nil)
      )
      account.update!(settings: { 'candy_ai' => { 'enabled' => true } })
      inbox.update!(candy_ai_settings: { 'enabled' => true, 'mode' => 'assist' })

      result = described_class.for(account: account, inbox: inbox)

      expect(result['enabled']).to be(false)
    end

    it 'cannot bypass an account-level disablement via inbox' do
      allow(CandyAI).to receive(:config).and_return(
        instance_double(CandyAI::Configuration, enabled?: true, default_ai_provider: nil)
      )
      account.update!(settings: { 'candy_ai' => { 'enabled' => false } })
      inbox.update!(candy_ai_settings: { 'enabled' => true, 'mode' => 'assist' })

      result = described_class.for(account: account, inbox: inbox)

      expect(result['enabled']).to be(false)
    end

    it 'uses the account provider when the inbox does not override' do
      allow(CandyAI).to receive(:config).and_return(
        instance_double(CandyAI::Configuration, enabled?: true, default_ai_provider: nil)
      )
      account.update!(settings: { 'candy_ai' => { 'enabled' => true, 'provider' => 'openai' } })
      inbox.update!(candy_ai_settings: { 'enabled' => true, 'mode' => 'assist' })

      result = described_class.for(account: account, inbox: inbox)

      expect(result['provider']).to eq('openai')
    end

    it 'lets the inbox override mode and provider' do
      allow(CandyAI).to receive(:config).and_return(
        instance_double(CandyAI::Configuration, enabled?: true, default_ai_provider: nil)
      )
      account.update!(settings: { 'candy_ai' => { 'enabled' => true, 'provider' => 'openai', 'model' => 'a-model' } })
      inbox.update!(candy_ai_settings: { 'enabled' => true, 'mode' => 'assist', 'provider' => 'gemini', 'model' => 'g-model' })

      result = described_class.for(account: account, inbox: inbox)

      expect(result['provider']).to eq('gemini')
      expect(result['model']).to eq('g-model')
    end

    it 'resolves autonomous mode flags' do
      allow(CandyAI).to receive(:config).and_return(
        instance_double(CandyAI::Configuration, enabled?: true, default_ai_provider: nil)
      )
      account.update!(settings: { 'candy_ai' => { 'enabled' => true } })
      inbox.update!(candy_ai_settings: { 'enabled' => true, 'mode' => 'autonomous' })

      result = described_class.for(account: account, inbox: inbox)

      expect(result).to include('enabled' => true, 'assist_enabled' => false, 'autonomous_enabled' => true)
    end
  end
end
