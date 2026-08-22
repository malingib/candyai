# frozen_string_literal: true

module CandyAI
  class AccountConfiguration
    DEFAULTS = {
      'enabled' => false,
      'provider' => nil,
      'model' => nil,
      'system_prompt' => nil,
      'temperature' => 0.2,
      'max_tokens' => 800,
      'handoff_enabled' => true,
      'handoff_message' => 'I will connect you with a human agent.'
    }.freeze

    INBOX_DEFAULTS = {
      'enabled' => false,
      'mode' => 'assist',
      'provider' => nil,
      'model' => nil,
      'system_prompt' => nil,
      'handoff_enabled' => true,
      'handoff_message' => nil
    }.freeze

    ALLOWED_MODES = %w[assist autonomous].freeze

    def self.account(account)
      DEFAULTS.merge((account.settings || {})['candy_ai'] || {})
    end

    def self.inbox(inbox)
      INBOX_DEFAULTS.merge(inbox.candy_ai_settings || {})
    end

    def self.effective(inbox)
      account_config = account(inbox.account)
      inbox_config = inbox(inbox)

      account_config.merge(inbox_config) do |_key, account_value, inbox_value|
        inbox_value.nil? ? account_value : inbox_value
      end.tap do |effective|
        # Account enablement is the global kill switch. An inbox can opt in,
        # but it must never bypass an account-level disablement.
        effective['enabled'] = account_config['enabled'] == true && inbox_config['enabled'] == true
      end
    end

    def self.normalize(params)
      values = params.to_h.stringify_keys.slice(*DEFAULTS.keys)
      values['temperature'] = values['temperature'].to_f.clamp(0.0, 2.0) if values.key?('temperature')
      values['max_tokens'] = values['max_tokens'].to_i.clamp(1, 16_384) if values.key?('max_tokens')
      values['enabled'] = ActiveModel::Type::Boolean.new.cast(values['enabled']) if values.key?('enabled')
      values['handoff_enabled'] = ActiveModel::Type::Boolean.new.cast(values['handoff_enabled']) if values.key?('handoff_enabled')
      values
    end

    def self.normalize_inbox(params)
      values = params.to_h.stringify_keys.slice(*INBOX_DEFAULTS.keys)
      values['mode'] = 'assist' unless ALLOWED_MODES.include?(values['mode'])
      values['enabled'] = ActiveModel::Type::Boolean.new.cast(values['enabled']) if values.key?('enabled')
      values['handoff_enabled'] = ActiveModel::Type::Boolean.new.cast(values['handoff_enabled']) if values.key?('handoff_enabled')
      values
    end
  end
end
