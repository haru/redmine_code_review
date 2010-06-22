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

require_dependency 'change'

module CodeReviewChangePatch
  def self.included(base) # :nodoc:
    base.send(:include, ChangeInstanceMethodsCodeReview)

    base.class_eval do
      unloadable # Send unloadable so it will not be unloaded in development
      has_many :code_reviews, :dependent => :destroy
      has_many :code_review_assignments, :dependent => :destroy
      
    end

  end
end

module ChangeInstanceMethodsCodeReview
  #
  # for review_issues
  #
  def review_count
    code_reviews.select{|o|
      o.issue_id != nil
    }.length
  end

  def open_review_count
    open_reviews = code_reviews.select { |o| 
      o.issue_id != nil and !o.is_closed?
    }
    open_reviews.length
  end

  def closed_review_count
    code_reviews.select { |o| o.issue_id != nil and o.is_closed? }.length
  end

  #
  # for assignment_issues
  #
  def assignment_count
    code_review_assignments.length
  end

  def open_assignment_count
    open_assignments.length
  end

  def open_assignments(user_id = nil)
    code_review_assignments.select { |o|
      (!o.is_closed? and (user_id == nil or user_id == o.issue.assigned_to_id))
    }
  end

  def closed_assignment_count
    code_review_assignments.select { |o| o.is_closed? }.length
  end

  def after_save
    return unless CodeReviewAssignment.find(:all, :conditions => ['changeset_id = ?', changeset.id]).length == 0
    return unless changeset.repository
    return unless changeset.repository.project
    setting = CodeReviewProjectSetting.find_or_create(changeset.repository.project)
    auto_assign = setting.auto_assign_settings
    return unless auto_assign.enabled?
    return unless auto_assign.match_with_change?(self)
    CodeReviewAssignment.create_with_changeset(changeset)
  end
end

Change.send(:include, CodeReviewChangePatch)
