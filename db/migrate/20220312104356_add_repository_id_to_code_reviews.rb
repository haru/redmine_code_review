class AddRepositoryIdToCodeReviews < ActiveRecord::Migration[5.2]
  def change
    add_column :code_reviews, :repository_id, :string
  end
end
