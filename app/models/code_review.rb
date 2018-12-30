# Code Review plugin for Redmine
# Copyright (C) 2009-2017  Haruyuki Iida
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
  include Redmine::SafeAttributes
  unloadable
  belongs_to :project
  belongs_to :change
  belongs_to :issue
  belongs_to :updated_by, :class_name => 'User', :foreign_key => 'updated_by_id'
  belongs_to :attachment

  validates_presence_of :project_id, :user_id, :updated_by_id, :issue,
    :subject, :action_type, :line

  STATUS_OPEN = 0
  STATUS_CLOSED = 1

  def before_create
    issue = Issue.new unless issue
  end

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
    return changeset.author if changeset
  end

  def path
    begin
      return file_path if file_path
      return @path if @path
      if attachment_id
        @path = attachment.filename
        return @path
      end
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
    return rev if rev
    changeset.revision if changeset
  end

  def changeset
    @changeset ||= change.changeset if change
  end

  def repository
    @repository ||= changeset.repository if changeset
  end

  def repository_identifier
    return nil unless repository
    @repository_identifier ||= repository.identifier_param
  end

  def comment=(str)
    issue.description = str if issue
  end

  def comment
    issue.description if issue
  end

  def before_save
    issue.project_id = project_id unless issue.project_id
  end

  def validate
    unless issue.validate
      false
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

  def parent_id=(p)
    issue.parent_issue_id = p
  end

  def parent_id
    issue.parent_issue_id
  end

  def status_id=(s)
    issue.status_id = s
  end

  def status_id
    issue.status_id
  end

  def open_assignment_issues(user_id)
    issues = []
    assignments = []
    assignments = change.code_review_assignments if change
    assignments = assignments + changeset.code_review_assignments if changeset
    assignments = assignments + attachment.code_review_assignments if attachment

    assignments.each { |assignment|
      unless assignment.is_closed?
        issues << assignment.issue if user_id == assignment.issue.assigned_to_id
      end
    }

    issues
  end
end
