# frozen_string_literal: true

module CandyAI
  class ConversationOrchestrator
    Result = Data.define(:status, :reply, :reason, :context)

    HANDOFF_PHRASES = [/human agent/i, /talk to (a )?person/i, /representative/i, /speak to someone/i].freeze

    def self.process(conversation:, message:)
      new(conversation:, message:).process
    end

    def initialize(conversation:, message:)
      @conversation = conversation
      @message = message
      @inbox = conversation.inbox
      @account = conversation.account
      @config = AccountConfiguration.effective(@inbox)
    end

    def process
      return Result.new(:skipped, nil, 'disabled', {}) unless @config['enabled']
      return Result.new(:skipped, nil, 'not_incoming', {}) unless @message.incoming?
      return handoff('customer_requested_human') if human_requested?
      return Result.new(:assist, nil, 'assist_mode', context) unless @config['mode'] == 'autonomous'

      grounded = GroundingContext.for(
        account: @account,
        conversation: @conversation,
        inbox: @inbox,
        query: @message.content
      )

      return handoff('no_grounding') if grounded.blank? && @config['handoff_enabled']

      reply = generate_reply(grounded)
      return handoff('generation_failed') if reply.blank? && @config['handoff_enabled']

      Result.new(:reply, reply, 'autonomous', context.merge('grounding' => grounded))
    rescue StandardError => e
      Rails.logger.error("[CandyAI] orchestration failed: #{e.class}: #{e.message}")
      handoff('orchestration_error')
    end

    private

    def human_requested?
      HANDOFF_PHRASES.any? { |phrase| @message.content.to_s.match?(phrase) }
    end

    def context
      {
        'account_id' => @account.id,
        'inbox_id' => @inbox.id,
        'conversation_id' => @conversation.id,
        'mode' => @config['mode']
      }
    end

    def generate_reply(grounding)
      provider = @config['provider'].presence
      model = @config['model'].presence
      return nil if provider.blank? || model.blank?

      prompt = [@config['system_prompt'], grounding, "Customer: #{@message.content}"].compact.join("\n\n")
      CandyAI::LlmGateway.complete(provider:, model:, prompt:, temperature: @config['temperature'], max_tokens: @config['max_tokens'])
    end

    def handoff(reason)
      Result.new(:handoff, @config['handoff_message'], reason, context)
    end
  end
end
