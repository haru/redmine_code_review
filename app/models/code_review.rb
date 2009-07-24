# Code Review plugin for Redmine
# Copyright (C) 2009  Haruyuki Iida
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 2
# of the License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
class CodeReview < ActiveRecord::Base
  unloadable
  belongs_to :project
  belongs_to :change
  belongs_to :issue
  belongs_to :updated_by, :class_name => 'User', :foreign_key => 'updated_by_id'

  #deprecated
  has_many :children, :class_name => 'CodeReview', :foreign_key=> :old_parent_id, :dependent => :destroy

  validates_presence_of :comment
  validates_presence_of :project_id
  validates_presence_of :user_id
  validates_presence_of :change_id
  validates_presence_of :updated_by_id
  validates_presence_of :issue
  validates_presence_of :subject

  STATUS_OPEN = 0
  STATUS_CLOSED = 1

  def is_closed?
    issue.closed?
    #self.root.status == STATUS_CLOSED
  end

  def close
    issue.status = IssueStatus.find(5)
    #self.root.status = STATUS_CLOSED
  end

  def reopen
    issue.status = IssueStatus.find(1)
    #self.root.status = STATUS_OPEN
  end
  
  def committer
    begin
      return changeset.author if changeset.respond_to?('author')

      # For development mode. I don't know why "changeset.respond_to?('author')"
      # is false in development mode.
      if changeset.user_id
        return User.find(changeset.user_id)
      end
      changeset.committer.to_s.split('<').first
    rescue
    end
  end

  def path
    begin
      return @path if @path
      repository = changeset.repository
      url = repository.url
      root_url = repository.root_url
      if (url == nil || root_url == nil)
        @path = change.path
        return @path
      end
      rootpath = url[root_url.length, url.length - root_url.length]
      if rootpath == '/' || rootpath.blank?
        @path = change.path
      else
        @path = change.path[rootpath.length, change.path.length - rootpath.length]
      end      
    rescue => ex
      return ex.to_s
    end
  end

  def revision
    begin
      changeset.revision
    rescue
    end
  end

  def changeset
    @changeset ||= Changeset.find(change.changeset_id) if change
  end

  def repository
    @repository ||= changeset.repository if changeset
  end

  def comment=(str)  
    issue.description = str
  end

  def comment
    issue.description
  end

  def before_save
    issue.project_id = project_id unless issue.project_id
  end

  def validate
    unless issue.validate
      return false
      
    end
  end

  def user=(u)
    issue.author = u
  end

  def user_id=(id)
    issue.author_id = id
  end

  def user_id
    issue.author_id
  end

  def user
    issue.author if issue
  end

  def subject=(s)
    issue.subject = s
  end

  def subject
    issue.subject
  end

  def status_id=(s)
    issue.status_id = s
  end

  def status_id
    issue.status_id
  end

  def convert_to_new_data
    closed_status = IssueStatus.find(:first, :conditions => 'id = 5')
    closed_status = IssueStatus.find(:first, :conditions => ['is_closed = ?', true]) unless closed_status
    setting = CodeReviewProjectSetting.find_by_project_id(self.project_id)
    review = CodeReview.new
    review.project_id = self.project_id
    review.issue = Issue.new
    review.issue.project_id = self.project_id
    review.issue.tracker_id = setting.tracker_id
    review.issue.start_date = self.created_at
    review.issue.created_on = self.created_at
    review.comment = self.old_comment
    review.comment = 'No comment.' unless review.comment
    review.user_id = self.old_user_id
    review.change_id = self.change_id
    review.issue.assigned_to_id = self.changeset.user_id if self.changeset
    review.updated_by = self.updated_by
    review.subject = "code review"
    review.line = self.line
    if closed_status and self.old_status != 0
      review.issue.status_id = closed_status.id
    end
    review.save!
    review.issue.save!

    self.all_children.each{|child|
      user = User.find(child.old_user_id)
      journal = review.issue.init_journal(user, child.old_comment)
      journal.created_on = child.created_at
      review.issue.save!
    }

    return review
  end

  #deprecated
  def all_children
    return @all_children if @all_children
    @all_children = children
    children.each {|child|
      @all_children = @all_children + child.children
    }
    @all_children = @all_children.sort{|a, b| a.id <=> b.id}
  end
end
