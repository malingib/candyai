class AddCandyAiSettingsToInboxes < ActiveRecord::Migration[7.1]
  def change
    add_column :inboxes, :candy_ai_settings, :jsonb, null: false, default: {}
  end
end
