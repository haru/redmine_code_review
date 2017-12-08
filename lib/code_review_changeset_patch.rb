# Code Review plugin for Redmine
# Copyright (C) 2009-2015  Haruyuki Iida
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

require_dependency 'changeset'

module CodeReviewChangesetPatch
  def self.included(base) # :nodoc:
    base.class_eval do
      unloadable # Send unloadable so it will not be unloaded in development
      has_many :code_review_assignments, :dependent => :destroy
    end
  end
end

module ChangesetInstanceMethodsCodeReview
  #
  # for review issues
  #
  def review_count
    return @review_count if @review_count
    @review_count = 0
    filechanges.each { |change|
      @review_count += change.review_count
    }
    return @review_count
  end

  def open_review_count
    return @open_review_count if @open_review_count
    @open_review_count = 0
    filechanges.each { |change|
      @open_review_count += change.open_review_count
    }
    return @open_review_count
  end

  def open_reviews
    return @open_reviews if @open_reviews
    @open_reviews = []
    filechanges.each do |change|
      @open_reviews = @open_reviews + change.open_reviews
    end
    @open_reviews
  end

  def review_issues
    return @review_issues if @review_issues
    filechanges.each { |change|
      unless @review_issues
        @review_issues = change.code_reviews.collect { |issue| issue }
      else
        @review_issues = @review_issues + change.code_reviews.collect { |issue| issue }
      end
      @review_issues
    }
  end

  def closed_review_count
    review_count - open_review_count
  end

  def closed_review_pourcent
    if review_count == 0
      0
    else
      closed_review_count * 100.0 / review_count
    end
  end

  def completed_review_pourcent
    if review_count == 0
      0
    elsif open_review_count == 0
      100
    else
      @completed_review_pourcent ||= (closed_review_count * 100 + open_reviews.collect { |o|
        o.issue.done_ratio
      }.inject(:+)) / review_count
    end
  end

  #
  # for assignment issues
  #

  def assignment_count
    #return @assignment_count if @assignment_count
    @assignment_count = code_review_assignments.length
    filechanges.each { |change|
      @assignment_count += change.assignment_count
    }
    return @assignment_count
  end

  def open_assignment_count
    return @open_assignment_count if @open_assignment_count
    @open_assignment_count = code_review_assignments.select { |assignment|
      !assignment.is_closed?
    }.length
    filechanges.each { |change|
      @open_assignment_count += change.open_assignment_count
    }
    return @open_assignment_count
  end

  def assignment_issues
    return @assignment_issues if @assignment_issues
    @assignment_issues = code_review_assignments
    filechanges.each { |change|
      @assignment_issues = @assignment_issues + change.code_review_assignments.collect { |issue| issue }
    }
    @assignment_issues
  end

  def open_assignments
    return @open_assignments if @open_assignments
    @open_assignments = code_review_assignments.select { |assignment|
      !assignment.is_closed?
    }
    filechanges.each { |change|
      @open_assignments = @open_assignments + change.code_review_assignments.select { |assignment|
        !assignment.is_closed?
      }
    }
  end

  def closed_assignment_count
    assignment_count - open_assignment_count
  end

  def closed_assignment_pourcent
    if assignment_count == 0
      0
    else
      closed_assignment_count * 100.0 / assignment_count
    end
  end

  def completed_assignment_pourcent
    if assignment_count == 0
      0
    elsif open_assignment_count == 0
      100
    else
      opens = open_assignments
      @completed_assignment_pourcent ||= (closed_assignment_count * 100 + open_assignments.collect { |o|
        o.issue.done_ratio
      }.sum) / assignment_count
    end
  end

  #
  # changeset作成時にレビューの自動アサインを行う
  #
  def scan_comment_for_issue_ids
    ret = super
    project = repository.project if repository
    return ret unless project
    return ret unless project.module_enabled?('code_review')
    setting = CodeReviewProjectSetting.find_or_create(project)
    auto_assign = setting.auto_assign_settings
    return ret unless auto_assign.enabled?
    return unless auto_assign.match_with_changeset?(self)
    CodeReviewAssignment.create_with_changeset(self)
    ret
  end
end

Changeset.prepend(ChangesetInstanceMethodsCodeReview)
