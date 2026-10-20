# frozen_string_literal: true

class CandyAI::ConversationOrchestrator
  Result = Data.define(:status, :reply, :reason, :context)

  HANDOFF_PHRASES = [/human agent/i, /talk to (a )?person/i, /representative/i, /speak to someone/i].freeze

  def self.process(conversation:, message:)
    new(conversation: conversation, message: message).process
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
    return Result.new(:assist, nil, 'assist_mode', context) unless autonomous_mode?

    generate_grounded_response
  rescue StandardError => e
    Rails.logger.error("[CandyAI] orchestration failed (#{e.class.name})")
    handoff('orchestration_error')
  end

  private

  def autonomous_mode?
    @config['mode'] == 'autonomous'
  end

  def generate_grounded_response
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
  end

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

    system_content = [@config['system_prompt'], grounding].compact_blank.join("\n\n")
    messages = []
    messages << { role: 'system', content: system_content } if system_content.present?
    messages << { role: 'user', content: @message.content_for_llm.to_s }

    CandyAI::LlmGateway.complete(
      provider: provider,
      model: model,
      messages: messages,
      generation: { temperature: @config['temperature'], max_tokens: @config['max_tokens'] },
      usage_context: {
        account: @account,
        conversation: @conversation,
        idempotency_key: "completion:#{@conversation.id}:#{@message.id}"
      }
    )
  end

  def handoff(reason)
    Result.new(:handoff, @config['handoff_message'], reason, context)
  end
end
