# frozen_string_literal: true

class CreateCandyAISuggestions < ActiveRecord::Migration[7.0]
  def change
    create_suggestions_table
    add_suggestion_indexes
    add_suggestion_foreign_keys
  end

  private

  def create_suggestions_table
    create_table :candy_ai_suggestions do |t|
      add_identity_columns(t)
      add_content_columns(t)
      add_metadata_columns(t)
      t.timestamps
    end
  end

  def add_identity_columns(table)
    table.bigint :account_id, null: false
    table.bigint :inbox_id, null: false
    table.bigint :conversation_id, null: false
    table.bigint :message_id, null: false
    table.string :status, null: false, default: 'pending'
    table.string :source, null: false, default: 'message_created'
  end

  def add_content_columns(table)
    table.text :content
    table.string :provider
    table.string :model
    table.string :failure_category
    table.text :error_message
  end

  def add_metadata_columns(table)
    table.jsonb :usage, null: false, default: {}
    table.jsonb :context_metadata, null: false, default: {}
    table.datetime :generation_started_at
    table.datetime :generated_at
    table.datetime :expires_at
    table.datetime :accepted_at
    table.datetime :rejected_at
    table.integer :duration_ms
    table.string :request_id
  end

  def add_suggestion_indexes
    add_index :candy_ai_suggestions, [:account_id, :conversation_id, :created_at],
              name: 'idx_candy_ai_suggestions_account_conversation'
    add_index :candy_ai_suggestions, [:conversation_id, :status, :created_at],
              name: 'idx_candy_ai_suggestions_conversation_status'
    add_index :candy_ai_suggestions, :request_id, unique: true, where: 'request_id IS NOT NULL'
    add_index(
      :candy_ai_suggestions,
      :message_id,
      unique: true,
      where: "status IN ('pending', 'generating')",
      name: 'idx_candy_ai_suggestions_active_message'
    )
  end

  def add_suggestion_foreign_keys
    add_foreign_key :candy_ai_suggestions, :accounts, on_delete: :cascade
    add_foreign_key :candy_ai_suggestions, :inboxes, on_delete: :cascade
    add_foreign_key :candy_ai_suggestions, :conversations, on_delete: :cascade
    add_foreign_key :candy_ai_suggestions, :messages, on_delete: :cascade
  end
end
