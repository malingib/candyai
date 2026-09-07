# frozen_string_literal: true

require 'rails_helper'

RSpec.describe CandyAI::KnowledgeRetrieval do
  let(:account) { create(:account) }
  let(:inbox) { create(:inbox, account: account) }

  it 'returns relevant account knowledge before unrelated knowledge' do
    relevant = CandyAI::KnowledgeDocument.create!(
      account: account, title: 'Refund policy', content: 'Customers can request a refund within 7 days.'
    )
    CandyAI::KnowledgeDocument.create!(
      account: account, title: 'Office hours', content: 'Our office opens Monday to Friday.'
    )

    results = described_class.search(account: account, inbox: inbox, query: 'How do I get a refund?')

    expect(results.first.document).to eq(relevant)
  end

  it 'does not leak knowledge across accounts' do
    other_account = create(:account)
    CandyAI::KnowledgeDocument.create!(
      account: other_account, title: 'Secret policy', content: 'secret refund information'
    )

    results = described_class.search(account: account, query: 'secret refund')

    expect(results).to be_empty
  end
end
