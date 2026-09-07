# frozen_string_literal: true

require 'rails_helper'

RSpec.describe CandyAI::KnowledgeIngestion do
  let(:account) { create(:account) }

  describe '.ingest_text' do
    it 'stores account-scoped knowledge' do
      document = described_class.ingest_text(
        account: account,
        title: 'Refund policy',
        content: 'Refunds are processed within seven days.'
      )

      expect(document).to be_persisted
      expect(document.account).to eq(account)
      expect(document.source_type).to eq('text')
    end

    it 'rejects oversized content' do
      expect do
        described_class.ingest_text(
          account: account,
          title: 'Large',
          content: 'x' * (described_class::MAX_CONTENT_BYTES + 1)
        )
      end.to raise_error(ArgumentError, 'content is too large')
    end
  end
end
