# frozen_string_literal: true

# CandyAI v0.2 intelligence layer schema additions.
#
# - Adds lightweight conversation-intelligence + quality signals to suggestions.
# - Adds a dedicated AI usage record table so usage metadata is captured once,
#   separately from suggestions, and never stores provider keys or full prompts.
class CandyAiIntelligenceLayer < ActiveRecord::Migration[7.2]
  def change
    add_column :candy_ai_suggestions, :intelligence, :jsonb, null: false, default: {}
    add_column :candy_ai_suggestions, :quality_status, :string
    add_column :candy_ai_suggestions, :quality_failures, :jsonb, null: false, default: []

    add_index :candy_ai_suggestions, :quality_status,
              name: 'idx_candy_ai_suggestions_quality_status'

    create_table :candy_ai_usage_records do |t|
      t.integer :account_id, null: false
      t.integer :inbox_id
      t.integer :conversation_id
      t.integer :suggestion_id
      t.string :provider
      t.string :model
      t.string :request_id
      t.datetime :requested_at, null: false
      t.datetime :completed_at
      t.integer :duration_ms
      t.integer :input_tokens
      t.integer :output_tokens
      t.integer :total_tokens
      t.decimal :estimated_cost, precision: 12, scale: 6
      t.boolean :success, null: false, default: false
      t.string :error_category
      t.timestamps
    end

    add_index :candy_ai_usage_records, [:account_id, :created_at],
              name: 'idx_candy_ai_usage_account_created'
    add_index :candy_ai_usage_records, [:account_id, :conversation_id, :created_at],
              name: 'idx_candy_ai_usage_account_conversation'
    add_index :candy_ai_usage_records, :suggestion_id,
              name: 'idx_candy_ai_usage_suggestion'
    add_index :candy_ai_usage_records, :request_id,
              name: 'idx_candy_ai_usage_request_id'

    add_foreign_key :candy_ai_usage_records, :accounts, on_delete: :cascade
    add_foreign_key :candy_ai_usage_records, :inboxes, on_delete: :nullify
    add_foreign_key :candy_ai_usage_records, :conversations, on_delete: :nullify
    add_foreign_key :candy_ai_usage_records, :candy_ai_suggestions, column: :suggestion_id, on_delete: :nullify
  end
end
