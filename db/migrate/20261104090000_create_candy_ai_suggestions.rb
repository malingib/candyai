# frozen_string_literal: true

class CreateCandyAiSuggestions < ActiveRecord::Migration[7.2]
  def change
    create_table :candy_ai_suggestions do |t|
      t.bigint :account_id, null: false
      t.bigint :inbox_id, null: false
      t.bigint :conversation_id, null: false
      t.bigint :message_id, null: false
      t.string :status, null: false, default: 'pending'
      t.string :source, null: false, default: 'message_created'
      t.text :content
      t.string :provider
      t.string :model
      t.string :failure_category
      t.text :error_message
      t.jsonb :usage, null: false, default: {}
      t.jsonb :context_metadata, null: false, default: {}
      t.datetime :generation_started_at
      t.datetime :generated_at
      t.datetime :expires_at
      t.datetime :accepted_at
      t.datetime :rejected_at
      t.integer :duration_ms
      t.string :request_id
      t.timestamps
    end

    add_index :candy_ai_suggestions, [:account_id, :conversation_id, :created_at],
              name: 'idx_candy_ai_suggestions_account_conversation'
    add_index :candy_ai_suggestions, [:conversation_id, :status, :created_at],
              name: 'idx_candy_ai_suggestions_conversation_status'
    add_index :candy_ai_suggestions, :request_id, unique: true,
                                                   where: 'request_id IS NOT NULL'
    add_index :candy_ai_suggestions, :message_id, unique: true,
                                                  where: "status IN ('pending', 'generating')",
                                                  name: 'idx_candy_ai_suggestions_active_message'

    add_foreign_key :candy_ai_suggestions, :accounts, on_delete: :cascade
    add_foreign_key :candy_ai_suggestions, :inboxes, on_delete: :cascade
    add_foreign_key :candy_ai_suggestions, :conversations, on_delete: :cascade
    add_foreign_key :candy_ai_suggestions, :messages, on_delete: :cascade
  end
end
