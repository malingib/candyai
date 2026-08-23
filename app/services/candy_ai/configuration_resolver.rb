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
  #
  # Kill switches are enforced here:
  #   * CandyAI.config.enabled            -> global kill switch
  #   * account.enabled                   -> account kill switch
  #   * inbox.enabled + account.enabled   -> inbox opt-in (cannot bypass)
  #   * mode == 'autonomous' is surfaced but Assist generation refuses it.
  class ConfigurationResolver
    # Returns a frozen hash with a stable, fully-resolved schema:
    #   enabled, assist_enabled, autonomous_enabled, provider, model,
    #   system_instructions, temperature, max_tokens, mode, handoff_enabled,
    #   handoff_message, context_message_limit, context_character_limit,
    #   generation_limit, fallback_provider
    def self.for(account:, inbox: nil)
      new(account: account, inbox: inbox).resolve
    end

    def initialize(account:, inbox: nil)
      @account = account
      @inbox = inbox
    end

    def resolve
      merged = account_config.merge(inbox_overrides) do |_key, account_value, inbox_value|
        inbox_value.nil? ? account_value : inbox_value
      end

      # 'enabled' is a kill switch and must not be overridden by a lower layer.
      # Compute it independently from raw account/inbox settings.
      enabled = global_enabled? &&
                (account_config['enabled'] == true) &&
                (!@inbox || inbox_overrides['enabled'] == true)

      effective = {
        'enabled' => enabled,
        'assist_enabled' => merged['mode'].to_s == 'assist',
        'autonomous_enabled' => merged['mode'].to_s == 'autonomous',
        'provider' => merged['provider'].presence || CandyAI.config.default_ai_provider,
        'model' => merged['model'].presence,
        'system_instructions' => merged['system_prompt'].presence,
        'temperature' => merged['temperature'],
        'max_tokens' => merged['max_tokens'],
        'mode' => merged['mode'].to_s,
        'handoff_enabled' => merged['handoff_enabled'],
        'handoff_message' => merged['handoff_message'].presence,
        'context_message_limit' => merged['context_message_limit'] || CandyAI::ContextBuilder::MAX_MESSAGES,
        'context_character_limit' => merged['context_character_limit'] || CandyAI::ContextBuilder::MAX_CONTEXT_CHARACTERS,
        'generation_limit' => merged['generation_limit'] || DEFAULT_GENERATION_LIMIT,
        'fallback_provider' => merged['fallback_provider'].presence
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

    def account_enabled?(merged)
      merged['enabled'] == true
    end

    def inbox_enabled?(merged)
      return true unless @inbox

      merged['enabled'] == true
    end
  end
end
