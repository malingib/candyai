# frozen_string_literal: true

require 'rails_helper'

RSpec.describe CandyAI::ConfigurationResolver do
  let(:account) { create(:account) }
  let(:inbox) { create(:inbox, account: account) }

  before do
    allow(CandyAI).to receive(:config).and_return(
      instance_double(CandyAI::Configuration, enabled?: true, default_ai_provider: nil)
    )
  end

  describe '.for' do
    it 'returns a deterministic effective schema' do
      allow(CandyAI.config).to receive(:default_ai_provider).and_return('openai')
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

    it 'makes assist and autonomous flags false when the effective kill switch is off' do
      account.update!(settings: { 'candy_ai' => { 'enabled' => false } })
      inbox.update!(candy_ai_settings: { 'enabled' => true, 'mode' => 'autonomous' })

      result = described_class.for(account: account, inbox: inbox)

      expect(result).to include('enabled' => false, 'assist_enabled' => false, 'autonomous_enabled' => false)
    end

    it 'applies global kill switch' do
      allow(CandyAI.config).to receive(:enabled?).and_return(false)
      account.update!(settings: { 'candy_ai' => { 'enabled' => true } })
      inbox.update!(candy_ai_settings: { 'enabled' => true, 'mode' => 'assist' })

      result = described_class.for(account: account, inbox: inbox)

      expect(result['enabled']).to be(false)
      expect(result['assist_enabled']).to be(false)
    end

    it 'cannot bypass an account-level disablement via inbox' do
      account.update!(settings: { 'candy_ai' => { 'enabled' => false } })
      inbox.update!(candy_ai_settings: { 'enabled' => true, 'mode' => 'assist' })

      result = described_class.for(account: account, inbox: inbox)

      expect(result['enabled']).to be(false)
    end

    it 'uses the account provider when the inbox does not override' do
      account.update!(settings: { 'candy_ai' => { 'enabled' => true, 'provider' => 'openai' } })
      inbox.update!(candy_ai_settings: { 'enabled' => true, 'mode' => 'assist' })

      result = described_class.for(account: account, inbox: inbox)

      expect(result['provider']).to eq('openai')
    end

    it 'lets the inbox override mode and provider' do
      account.update!(settings: { 'candy_ai' => { 'enabled' => true, 'provider' => 'openai', 'model' => 'a-model' } })
      inbox.update!(candy_ai_settings: { 'enabled' => true, 'mode' => 'assist', 'provider' => 'gemini', 'model' => 'g-model' })

      result = described_class.for(account: account, inbox: inbox)

      expect(result['provider']).to eq('gemini')
      expect(result['model']).to eq('g-model')
    end

    it 'resolves account and inbox instructions independently' do
      account.update!(settings: { 'candy_ai' => { 'enabled' => true, 'system_prompt' => 'Account policy' } })
      inbox.update!(candy_ai_settings: {
                      'enabled' => true,
                      'mode' => 'assist',
                      'system_prompt' => 'Inbox policy'
                    })

      result = described_class.for(account: account, inbox: inbox)

      expect(result['account_instructions']).to eq('Account policy')
      expect(result['inbox_instructions']).to eq('Inbox policy')
      expect(result['system_instructions']).to eq('Account policy')
    end

    it 'does not invent inbox instructions when the inbox does not override them' do
      account.update!(settings: { 'candy_ai' => { 'enabled' => true, 'system_prompt' => 'Account policy' } })
      inbox.update!(candy_ai_settings: { 'enabled' => true, 'mode' => 'assist' })

      result = described_class.for(account: account, inbox: inbox)

      expect(result['account_instructions']).to eq('Account policy')
      expect(result['inbox_instructions']).to be_nil
    end

    it 'resolves autonomous mode flags' do
      account.update!(settings: { 'candy_ai' => { 'enabled' => true } })
      inbox.update!(candy_ai_settings: { 'enabled' => true, 'mode' => 'autonomous' })

      result = described_class.for(account: account, inbox: inbox)

      expect(result).to include('enabled' => true, 'assist_enabled' => false, 'autonomous_enabled' => true)
    end
  end
end
