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

  it 'limits inbox-specific retrieval to shared and matching inbox documents' do
    shared = CandyAI::KnowledgeDocument.create!(
      account: account, title: 'Refund policy', content: 'refund policy shared', inbox: nil
    )
    matching = CandyAI::KnowledgeDocument.create!(
      account: account, title: 'Refund process', content: 'refund process inbox', inbox: inbox
    )
    other_inbox = create(:inbox, account: account)
    CandyAI::KnowledgeDocument.create!(
      account: account, title: 'Refund exception', content: 'refund exception other inbox', inbox: other_inbox
    )

    results = described_class.search(account: account, inbox: inbox, query: 'refund')

    expect(results.map(&:document)).to contain_exactly(shared, matching)
  end

  it 'adds stable source labels and source URLs to bounded context' do
    document = CandyAI::KnowledgeDocument.create!(
      account: account,
      title: 'Refund policy',
      content: 'Customers can request a refund within 7 days.',
      source_type: 'url',
      source_url: 'https://docs.example.com/refunds'
    )

    context = described_class.new(account: account, query: 'refund', inbox: inbox, limit: 6).context

    expect(context).to include('[Source 1: Refund policy]')
    expect(context).to include('URL: https://docs.example.com/refunds')
    expect(context).to include(document.content)
    expect(context.length).to be <= described_class::MAX_CONTEXT_CHARS
  end

  it 'returns no results for queries without searchable terms' do
    CandyAI::KnowledgeDocument.create!(
      account: account, title: 'Refund policy', content: 'Customers can request a refund.'
    )

    expect(described_class.search(account: account, query: 'a to it')).to be_empty
  end
end
