# frozen_string_literal: true

module CandyAI
  # Lightweight conversation intelligence derived before generation.
  #
  # The default implementation is deterministic heuristic analysis so we do
  # not add a heavyweight second model. An optional structured analyzer may be
  # supplied, but its output is strictly allow-listed before it is trusted.
  class ConversationIntelligence
    INTENTS = %w[
      billing_question order_issue technical_issue account_access
      complaint compliment general_question greeting
    ].freeze
    SENTIMENTS = %w[positive neutral negative].freeze
    URGENCIES = %w[low normal high].freeze

    def initialize(analyzer: nil)
      @analyzer = analyzer
    end

    def analyze(context)
      conversation = context[:conversation] || context['conversation'] || []
      last_user_message = last_user_text(conversation)

      signals = {
        'intent' => detect_intent(last_user_message),
        'sentiment' => detect_sentiment(conversation),
        'urgency' => detect_urgency(last_user_message),
        'is_question' => question?(last_user_message),
        'resolved' => resolved?(conversation),
        'needs_human' => escalation?(last_user_message, conversation)
      }

      merge_ai_signals(signals) if @analyzer
      coerce(signals)
    end

    private

    def last_user_text(conversation)
      message = conversation.reverse.find do |entry|
        role = entry[:role] || entry['role']
        role.to_s == 'user'
      end
      return if message.blank?

      message[:content] || message['content']
    end

    def detect_intent(text)
      return 'general_question' if text.blank?

      lowered = text.downcase
      return 'billing_question' if lowered.match?(/payment|invoice|charge|refund|billing|subscription/)
      return 'order_issue' if lowered.match?(/order|shipment|delivery|tracking|package/)
      return 'technical_issue' if lowered.match?(/error|bug|not working|broken|crash|fail/)
      return 'account_access' if lowered.match?(/password|login|log in|reset|locked|access|2fa|otp/)
      return 'complaint' if lowered.match?(/unacceptable|terrible|worst|angry|frustrat/)
      return 'compliment' if lowered.match?(/thank|thanks|great|love|awesome|perfect/)
      return 'greeting' if lowered.match?(/\A(hi|hello|hey|good morning|good afternoon)\b/)

      'general_question'
    end

    def detect_sentiment(conversation)
      text = conversation_text(conversation).downcase
      negative = text.scan(/error|angry|terrible|worst|hate|broken|fail|frustrat|unacceptable|cancel|refund|disappointed/).size
      positive = text.scan(/thank|thanks|great|love|awesome|perfect|happy|excellent/).size
      return 'negative' if negative > positive && negative.positive?
      return 'positive' if positive > negative && positive.positive?

      'neutral'
    end

    def detect_urgency(text)
      return 'normal' if text.blank?

      lowered = text.downcase
      return 'high' if lowered.match?(/urgent|asap|immediately|emergency|right now|cant wait|today/)
      return 'low' if lowered.match?(/when you can|no rush|whenever|at your convenience/)

      'normal'
    end

    def question?(text)
      text.to_s.strip.end_with?('?') || text.to_s.match?(/\b(how|what|why|when|where|can you|could you|is it|are you|do you)\b/i)
    end

    def resolved?(conversation)
      return false if conversation.empty?

      last = conversation.last
      role = last[:role] || last['role']
      return false if role.to_s == 'user'

      text = (last[:content] || last['content']).to_s.downcase
      text.match?(/resolved|all set|thank you|thanks|that works|great|perfect|sorted/)
    end

    def escalation?(text, conversation)
      lowered = text.to_s.downcase
      direct_request = lowered.match?(/speak to (a|an|human|agent|person)|real person|manager|escalate|supervisor/)
      high_risk = detect_sentiment(conversation) == 'negative' && detect_urgency(text) == 'high'
      direct_request || high_risk
    end

    def conversation_text(conversation)
      conversation.filter_map { |entry| entry[:content] || entry['content'] }.join(' ')
    end

    def merge_ai_signals(signals)
      ai = @analyzer.call(signals)
      return signals unless ai.is_a?(Hash)

      ai = ai.transform_keys(&:to_s)
      signals['intent'] = ai['intent'] if INTENTS.include?(ai['intent'])
      signals['sentiment'] = ai['sentiment'] if SENTIMENTS.include?(ai['sentiment'])
      signals['urgency'] = ai['urgency'] if URGENCIES.include?(ai['urgency'])
      signals['is_question'] = !!ai['is_question'] unless ai['is_question'].nil?
      signals['resolved'] = !!ai['resolved'] unless ai['resolved'].nil?
      signals['needs_human'] = !!ai['needs_human'] unless ai['needs_human'].nil?
      signals
    rescue StandardError
      signals
    end

    def coerce(signals)
      coerced = {
        'intent' => signals['intent'],
        'sentiment' => signals['sentiment'],
        'urgency' => signals['urgency'],
        'is_question' => !!signals['is_question'],
        'resolved' => !!signals['resolved'],
        'needs_human' => !!signals['needs_human']
      }
      coerced['confidence'] = @analyzer ? 'assisted' : 'heuristic'
      coerced.freeze
    end
  end
end
