class CreateCodeReviews < ActiveRecord::Migration
  def self.up
    create_table :code_reviews do |t|

      t.column :project_id, :integer

      t.column :parent_id, :integer

      t.column :change_id, :integer

      t.column :created_at, :timestamp

      t.column :updated_at, :timestamp

      t.column :user_id, :integer

      t.column :comment, :text

      t.column :status, :integer

      t.column :line, :integer

    end
  end

  def self.down
    drop_table :code_reviews
  end
end
