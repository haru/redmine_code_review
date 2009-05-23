class CreateCodeReviewUserSettings < ActiveRecord::Migration
  def self.up
    create_table :code_review_user_settings do |t|

      t.column :user_id, :integer, :default=>0, :null => false

      t.column :mail_notification, :integer, :default=>0, :null => false

      t.column :created_at, :timestamp

      t.column :updated_at, :timestamp

    end
  end

  def self.down
    drop_table :code_review_user_settings
  end
end
