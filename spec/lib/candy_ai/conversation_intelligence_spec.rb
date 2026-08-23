# frozen_string_literal: true

require 'rails_helper'

RSpec.describe CandyAI::ConversationIntelligence do
  let(:context) do
    {
      conversation: [
        { role: 'user', content: 'I was charged twice on my invoice, this is unacceptable!' },
        { role: 'assistant', content: 'I can help with that refund.' }
      ]
    }
  end

  it 'detects billing intent and negative sentiment' do
    signals = described_class.new.analyze(context)

    expect(signals['intent']).to eq('billing_question')
    expect(signals['sentiment']).to eq('negative')
    expect(signals['is_question']).to be(false)
  end

  it 'detects questions' do
    ctx = { conversation: [{ role: 'user', content: 'How do I reset my password?' }] }
    signals = described_class.new.analyze(ctx)

    expect(signals['is_question']).to be(true)
  end

  it 'detects high urgency' do
    ctx = { conversation: [{ role: 'user', content: 'I need this fixed ASAP, it is an emergency!' }] }
    signals = described_class.new.analyze(ctx)

    expect(signals['urgency']).to eq('high')
  end

  it 'flags escalation when a human is explicitly requested' do
    ctx = { conversation: [{ role: 'user', content: 'I want to speak to a real person now' }] }
    signals = described_class.new.analyze(ctx)

    expect(signals['needs_human']).to be(true)
  end

  it 'detects resolution from the last agent message' do
    ctx = { conversation: [
             { role: 'user', content: 'thanks that works now' },
             { role: 'assistant', content: 'Perfect, glad it is sorted' }
           ] }
    signals = described_class.new.analyze(ctx)

    expect(signals['resolved']).to be(true)
  end

  it 'sanitizes malformed AI signals via an analyzer' do
    analyzer = ->(_prev) { { 'intent' => 'invalid_intent', 'sentiment' => 'positive', 'urgency' => 'low' } }
    signals = described_class.new(analyzer: analyzer).analyze(context)

    expect(signals['intent']).to eq('billing_question') # invalid overridden back to heuristic
    expect(signals['sentiment']).to eq('positive')
    expect(signals.keys).to match_array(%w[intent sentiment urgency is_question resolved needs_human])
  end

  it 'returns a frozen hash of safe signals' do
    signals = described_class.new.analyze(context)

    expect(signals).to be_frozen
    expect(signals.keys).to match_array(%w[intent sentiment urgency is_question resolved needs_human confidence])
  end
end
