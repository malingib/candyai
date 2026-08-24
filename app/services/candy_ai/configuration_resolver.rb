# frozen_string_literal: true

module CandyAI
  # Single authoritative resolution path for CandyAI configuration.
  #
  # Resolution order (each layer overrides the previous one only when it
  # explicitly sets a value):
  #
  #   Global (CandyAI.config)
  #     ↓
  #   Account (account.settings['candy_ai'])
  #     ↓
  #   Inbox  (inbox.candy_ai_settings)
  #
  # The result is deterministic: controllers, jobs, and services must not
  # independently reconstruct precedence logic. They call `for(...)`.
  class ConfigurationResolver
    # Returns a frozen hash with a stable, fully-resolved schema.
    def self.for(account:, inbox: nil)
      new(account: account, inbox: inbox).resolve
    end

    def initialize(account:, inbox: nil)
      @account = account
      @inbox = inbox
    end

    def resolve
      account = account_config
      inbox = inbox_overrides
      merged = account.merge(inbox) do |_key, account_value, inbox_value|
        inbox_value.nil? ? account_value : inbox_value
      end

      enabled = global_enabled? &&
                (account['enabled'] == true) &&
                (!@inbox || inbox['enabled'] == true)

      account_instructions = account['system_prompt'].presence
      inbox_instructions = @inbox ? inbox['system_prompt'].presence : nil

      effective = {
        'enabled' => enabled,
        'assist_enabled' => enabled && merged['mode'].to_s == 'assist',
        'autonomous_enabled' => enabled && merged['mode'].to_s == 'autonomous',
        'provider' => merged['provider'].presence || CandyAI.config.default_ai_provider,
        'model' => merged['model'].presence,
        'account_instructions' => account_instructions,
        'inbox_instructions' => inbox_instructions,
        'system_instructions' => account_instructions,
        'temperature' => merged['temperature'],
        'max_tokens' => merged['max_tokens'],
        'mode' => merged['mode'].to_s,
        'handoff_enabled' => merged['handoff_enabled'],
        'handoff_message' => merged['handoff_message'].presence,
        'context_message_limit' => merged['context_message_limit'] || CandyAI::ContextBuilder::MAX_MESSAGES,
        'context_character_limit' => merged['context_character_limit'] || CandyAI::ContextBuilder::MAX_CONTEXT_CHARACTERS,
        'generation_limit' => merged['generation_limit'] || DEFAULT_GENERATION_LIMIT,
        'fallback_provider' => merged['fallback_provider'].presence,
        'daily_cost_limit_usd' => merged['daily_cost_limit_usd'].presence || ENV['CANDYAI_DAILY_COST_LIMIT_USD'].presence
      }

      effective.freeze
    end

    private

    DEFAULT_GENERATION_LIMIT = 3

    def account_config
      AccountConfiguration.account(@account)
    end

    def inbox_overrides
      return {} unless @inbox

      AccountConfiguration.inbox(@inbox)
    end

    def global_enabled?
      CandyAI.config.enabled?
    end
  end
end
