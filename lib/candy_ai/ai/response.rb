# frozen_string_literal: true

module CandyAI::AI
  Response = Data.define(:text, :model, :provider, :usage, :raw) do
    def initialize(text:, model: nil, provider: nil, usage: {}, raw: nil)
      super
    end
  end
end
