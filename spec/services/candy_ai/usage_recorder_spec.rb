# frozen_string_literal: true

require 'rails_helper'

RSpec.describe CandyAI::UsageRecorder do
  let(:account) { create(:account) }

  describe '.record!' do
    let(:attributes) do
      {
        account: account,
        idempotency_key: 'completion:conversation-10:message-20',
        event_type: 'completion',
        input_tokens: 120,
        output_tokens: 45,
        provider: 'openai',
        model: 'gpt-4o-mini',
        estimated_cost: BigDecimal('0.0012')
      }
    end

    it 'records usage without storing prompt or response text' do
      event = described_class.record!(**attributes)

      expect(event).to be_persisted
      expect(event.account).to eq(account)
      expect(event.input_tokens).to eq(120)
      expect(event.output_tokens).to eq(45)
      expect(event.metadata).to eq({})
    end

    it 'is idempotent for retried operations' do
      first = described_class.record!(**attributes)
      second = described_class.record!(**attributes, output_tokens: 999)

      expect(second.id).to eq(first.id)
      expect(CandyAI::UsageEvent.where(idempotency_key: attributes[:idempotency_key]).count).to eq(1)
      expect(second.output_tokens).to eq(45)
    end

    it 'does not allow a key to be reused across tenants' do
      described_class.record!(**attributes)
      other_account = create(:account)

      expect do
        described_class.record!(**attributes, account: other_account)
      end.to raise_error(ActiveRecord::RecordNotFound)
    end

    it 'rejects unknown event types and oversized metadata' do
      expect do
        described_class.record!(**attributes, event_type: 'prompt_dump')
      end.to raise_error(ArgumentError, 'unknown usage event type')

      expect do
        described_class.record!(**attributes, metadata: { 'note' => 'x' * (described_class::MAX_METADATA_BYTES + 1) })
      end.to raise_error(ArgumentError, 'metadata is too large')
    end
  end

  describe '.summary' do
    it 'aggregates usage for one account and time window' do
      described_class.record!(
        account: account, idempotency_key: 'completion:a', event_type: 'completion',
        input_tokens: 10, output_tokens: 5, estimated_cost: BigDecimal('0.0001')
      )
      described_class.record!(
        account: account, idempotency_key: 'completion:b', event_type: 'completion',
        input_tokens: 20, output_tokens: 7, estimated_cost: BigDecimal('0.0002')
      )
      described_class.record!(
        account: create(:account), idempotency_key: 'completion:other', event_type: 'completion',
        input_tokens: 900, output_tokens: 900
      )

      summary = described_class.summary(account: account, from: 1.hour.ago)

      expect(summary).to contain_exactly(
        hash_including(event_type: 'completion', events: 2, input_tokens: 30, output_tokens: 12)
      )
      expect(summary.first[:estimated_cost]).to eq(BigDecimal('0.0003'))
    end
  end
end
