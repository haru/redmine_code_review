class CodeReview < ActiveRecord::Base
  belongs_to :project
  belongs_to :user
  belongs_to :change
  acts_as_tree

  validates_presence_of :comment
  validates_presence_of :project_id
  validates_presence_of :user_id
  validates_presence_of :change_id

  acts_as_event :title => Proc.new {|o| "#{l(:code_review)}: #{'#' + o.id.to_s}" },
                  :description => Proc.new {|o| "#{o.comment}"},
                  :datetime => :updated_at,
                  :author => :user,
                  :type => 'code_review',
                  :url => Proc.new {|o| {:controller => 'code_review', :action => 'show', :id => o.project, :review_id => o.id} }

  acts_as_activity_provider :type => 'code_review',
                              :timestamp => "#{CodeReview.table_name}.updated_at",
                              :author_key => "#{CodeReview.table_name}.user_id",
                              :permission => :view_code_review,
                              :find_options => {:joins => "LEFT JOIN #{Project.table_name} ON #{Project.table_name}.id = #{CodeReview.table_name}.project_id"}



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
