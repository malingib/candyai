class CreateCandyAiSuggestions < ActiveRecord::Migration[7.2]
  def change
    create_table :candy_ai_suggestions do |t|
      t.integer :account_id, null: false
      t.integer :inbox_id, null: false
      t.integer :conversation_id, null: false
      t.integer :message_id, null: false
      t.string :status, null: false, default: 'completed'
      t.text :content
      t.string :provider
      t.string :model
      t.jsonb :usage, null: false, default: {}
      t.text :error_message
      t.timestamps
    end

    add_index :candy_ai_suggestions, [:account_id, :conversation_id, :created_at],
              name: 'idx_candy_ai_suggestions_account_conversation'
    add_index :candy_ai_suggestions, :inbox_id
    add_index :candy_ai_suggestions, :conversation_id
    add_index :candy_ai_suggestions, :message_id

    add_foreign_key :candy_ai_suggestions, :accounts, on_delete: :cascade
    add_foreign_key :candy_ai_suggestions, :inboxes, on_delete: :cascade
    add_foreign_key :candy_ai_suggestions, :conversations, on_delete: :cascade
    add_foreign_key :candy_ai_suggestions, :messages, on_delete: :cascade
  end
end
