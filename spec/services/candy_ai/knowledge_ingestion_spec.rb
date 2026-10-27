# frozen_string_literal: true

require 'rails_helper'
require 'stringio'

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

  describe '.ingest_url' do
    let(:url) { 'https://docs.example.com/refunds' }
    let(:result) do
      Struct.new(:tempfile, :content_type).new(
        StringIO.new('<html><body>Refunds are processed within seven days.</body></html>'),
        'text/html; charset=utf-8'
      )
    end

    before do
      allow(SafeFetch).to receive(:fetch).and_yield(result)
    end

    it 'fetches through SafeFetch and stores cleaned, account-scoped text' do
      document = described_class.ingest_url(account: account, url: url)

      expect(SafeFetch).to have_received(:fetch).with(
        url,
        hash_including(
          max_bytes: described_class::MAX_CONTENT_BYTES,
          allowed_content_type_prefixes: ['text/']
        )
      )
      expect(document).to be_persisted
      expect(document.account).to eq(account)
      expect(document.source_type).to eq('url')
      expect(document.source_url).to eq(url)
      expect(document.content).to include('Refunds are processed within seven days.')
      expect(document.content).not_to include('<html>')
    end

    it 'rejects non-HTTP URLs before making a request' do
      expect do
        described_class.ingest_url(account: account, url: 'file:///etc/passwd')
      end.to raise_error(ArgumentError, 'only absolute HTTP(S) URLs are supported')

      expect(SafeFetch).not_to have_received(:fetch)
    end

    it 'rejects URLs containing credentials' do
      expect do
        described_class.ingest_url(account: account, url: 'https://user:pass@docs.example.com/private')
      end.to raise_error(ArgumentError, 'URL credentials are not allowed')

      expect(SafeFetch).not_to have_received(:fetch)
    end

    it 'rejects non-standard ports' do
      expect do
        described_class.ingest_url(account: account, url: 'https://docs.example.com:8443/private')
      end.to raise_error(ArgumentError, 'non-standard URL ports are not allowed')

      expect(SafeFetch).not_to have_received(:fetch)
    end

    it 'translates SafeFetch SSRF rejection into a safe validation error' do
      allow(SafeFetch).to receive(:fetch).and_raise(SafeFetch::UnsafeUrlError, 'private address')

      expect do
        described_class.ingest_url(account: account, url: url)
      end.to raise_error(ArgumentError, 'knowledge source URL is not allowed: UnsafeUrlError')
    end
  end
end
