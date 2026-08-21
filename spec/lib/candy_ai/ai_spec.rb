# frozen_string_literal: true

require "rails_helper"
require "candy_ai/ai"

describe CandyAI::AI do
  describe CandyAI::AI::ProviderRegistry do
    it "registers and resolves providers by normalized name" do
      registry = described_class.new
      provider = Object.new

      registry.register(" OpenAI ", provider)

      expect(registry.fetch("openai")).to eq(provider)
      expect(registry.names).to eq(["openai"])
    end

    it "raises when a provider is missing" do
      registry = described_class.new

      expect { registry.fetch("missing") }.to raise_error(KeyError)
    end
  end

  describe CandyAI::AI::Provider do
    it "requires implementations to define chat" do
      provider = described_class.new

      expect { provider.chat(messages: []) }.to raise_error(NotImplementedError)
    end
  end
end
