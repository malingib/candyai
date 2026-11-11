# frozen_string_literal: true

class CreateCandyAIUsageEvents < ActiveRecord::Migration[7.0]
  def change
    create_table :candy_ai_usage_events do |t|
      t.references :account, null: false, foreign_key: true
      t.references :conversation, null: true, foreign_key: true
      t.string :event_type, null: false
      t.string :provider
      t.string :model
      t.string :idempotency_key, null: false
      t.integer :input_tokens, null: false, default: 0
      t.integer :output_tokens, null: false, default: 0
      t.decimal :estimated_cost, precision: 16, scale: 8, null: false, default: 0
      t.string :currency, null: false, default: 'USD'
      t.jsonb :metadata, null: false, default: {}
      t.timestamps
    end

    add_index :candy_ai_usage_events, [:account_id, :created_at]
    add_index :candy_ai_usage_events, [:account_id, :event_type, :created_at], name: 'index_candy_ai_usage_on_account_type_created'
    add_index :candy_ai_usage_events, :idempotency_key, unique: true
  end
end
