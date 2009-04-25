class CodeReview < ActiveRecord::Base
  belongs_to :project
  belongs_to :user
  belongs_to :change
  acts_as_tree

  validates_presence_of :comment
  validates_presence_of :project_id
  validates_presence_of :user_id
  validates_presence_of :change_id
end
