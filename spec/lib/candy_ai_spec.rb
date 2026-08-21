# frozen_string_literal: true

require 'rails_helper'
require Rails.root.join('lib/candy_ai')

describe CandyAI do
  it 'exposes the CandyAI product identity' do
    expect(described_class::PRODUCT_NAME).to eq('CandyAI')
    expect(described_class::COMPANY_NAME).to eq('MobiWave Innovations')
  end

  it 'has a stable application version' do
    expect(described_class::VERSION).to match(/\A\d+\.\d+\.\d+\z/)
  end
end
