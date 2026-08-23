# frozen_string_literal: true

require 'rails_helper'

RSpec.describe CandyAI::RateLimiter do
  let(:limiter) { described_class.new }

  it 'allows requests under the limit' do
    expect(limiter.check!(key: 'account:1', limit: 3, window: 1.minute)).to be(true)
    expect(limiter.check!(key: 'account:1', limit: 3, window: 1.minute)).to be(true)
  end

  it 'raises when the rate limit is exceeded' do
    3.times { limiter.check!(key: 'account:2', limit: 3, window: 1.minute) }

    expect { limiter.check!(key: 'account:2', limit: 3, window: 1.minute) }
      .to raise_error(described_class::LimitExceeded, 'generation rate limit exceeded')
  end

  it 'rejects duplicate requests via idempotency key' do
    limiter.check!(key: 'suggestion:9', limit: 5, window: 1.minute, idempotency_key: 'req-1')

    expect { limiter.check!(key: 'suggestion:9', limit: 5, window: 1.minute, idempotency_key: 'req-1') }
      .to raise_error(described_class::LimitExceeded, 'duplicate generation request')
  end

  it 'resets counts after the window elapses' do
    limiter.check!(key: 'account:3', limit: 1, window: 1.minute)
    travel_to(2.minutes.from_now) do
      expect(limiter.check!(key: 'account:3', limit: 1, window: 1.minute)).to be(true)
    end
  end
end
