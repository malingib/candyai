# frozen_string_literal: true

class CreateCandyAiKnowledgeDocuments < ActiveRecord::Migration[7.0]
  def change
    create_table :candy_ai_knowledge_documents do |t|
      t.references :account, null: false, foreign_key: true
      t.references :inbox, null: true, foreign_key: true
      t.string :source_type, null: false, default: 'text'
      t.string :source_url
      t.string :title, null: false
      t.text :content, null: false
      t.jsonb :metadata, null: false, default: {}
      t.string :status, null: false, default: 'active'
      t.datetime :last_ingested_at
      t.timestamps
    end

    add_index :candy_ai_knowledge_documents, [:account_id, :status]
    add_index :candy_ai_knowledge_documents, [:account_id, :source_url]
  end
end
