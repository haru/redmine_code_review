class CodeReview < ActiveRecord::Base
  belongs_to :project
  belongs_to :user
  belongs_to :change
  acts_as_tree

  validates_presence_of :comment
  validates_presence_of :project_id
  validates_presence_of :user_id
  validates_presence_of :change_id

  STATUS_OPEN = 0
  STATUS_CLOSED = 1

  def is_closed?
    self.root.status == STATUS_CLOSED
  end

  def close
    self.root.status = STATUS_CLOSED
  end

  def reopen
    self.root.status = STATUS_OPEN
  end
end
