# frozen_string_literal: true

class HardenCandyAiSuggestionLifecycle < ActiveRecord::Migration[7.2]
  def up
    change_column_default :candy_ai_suggestions, :status, from: 'completed', to: 'generated'
    execute "UPDATE candy_ai_suggestions SET status = 'generated' WHERE status = 'completed'"

    add_lifecycle_columns
    add_lifecycle_indexes
  end

  private

  def add_lifecycle_columns
    add_column :candy_ai_suggestions, :source, :string, null: false, default: 'message_created'
    add_column :candy_ai_suggestions, :failure_category, :string
    add_column :candy_ai_suggestions, :request_id, :string
    add_column :candy_ai_suggestions, :context_metadata, :jsonb, null: false, default: {}
    add_column :candy_ai_suggestions, :generation_started_at, :datetime
    add_column :candy_ai_suggestions, :generated_at, :datetime
    add_column :candy_ai_suggestions, :expires_at, :datetime
    add_column :candy_ai_suggestions, :accepted_at, :datetime
    add_column :candy_ai_suggestions, :rejected_at, :datetime
    add_column :candy_ai_suggestions, :duration_ms, :integer
  end

  def add_lifecycle_indexes
    add_index :candy_ai_suggestions, [:conversation_id, :status, :created_at],
              name: 'idx_candy_ai_suggestions_conversation_status_created'
    add_index :candy_ai_suggestions, [:account_id, :status, :created_at],
              name: 'idx_candy_ai_suggestions_account_status_created'
    add_index :candy_ai_suggestions, :request_id, unique: true, where: 'request_id IS NOT NULL'
    add_index :candy_ai_suggestions, :message_id, unique: true,
                                                  name: 'idx_candy_ai_suggestions_active_message',
                                                  where: "status IN ('pending', 'generating')"
  end

  public

  def down
    remove_index :candy_ai_suggestions, name: 'idx_candy_ai_suggestions_active_message'
    remove_index :candy_ai_suggestions, :request_id
    remove_index :candy_ai_suggestions, name: 'idx_candy_ai_suggestions_account_status_created'
    remove_index :candy_ai_suggestions, name: 'idx_candy_ai_suggestions_conversation_status_created'

    remove_column :candy_ai_suggestions, :duration_ms
    remove_column :candy_ai_suggestions, :rejected_at
    remove_column :candy_ai_suggestions, :accepted_at
    remove_column :candy_ai_suggestions, :expires_at
    remove_column :candy_ai_suggestions, :generated_at
    remove_column :candy_ai_suggestions, :generation_started_at
    remove_column :candy_ai_suggestions, :context_metadata
    remove_column :candy_ai_suggestions, :request_id
    remove_column :candy_ai_suggestions, :failure_category
    remove_column :candy_ai_suggestions, :source

    execute "UPDATE candy_ai_suggestions SET status = 'completed' WHERE status = 'generated'"
    change_column_default :candy_ai_suggestions, :status, from: 'generated', to: 'completed'
  end
end
