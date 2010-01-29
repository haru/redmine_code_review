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
require File.dirname(__FILE__) + '/../test_helper'

class CodeReviewChangesetPatchTest < ActiveSupport::TestCase
  fixtures :code_reviews, :projects, :users, :repositories, :changesets, :changes, :issues, :issue_statuses, :enumerations, :issue_categories, :trackers

  def test_review_count
    changeset = Changeset.find(100)
    assert_equal(2, changeset.review_count)
  end

  def test_open_review_count
    changeset = Changeset.find(100)
    assert_equal(2, changeset.open_review_count)
  end

  def test_closed_review_count
    changeset = Changeset.find(100)
    assert_equal(0, changeset.closed_review_count)
  end

  def test_review_issues
    changeset = Changeset.find(100)
    reviews = changeset.review_issues
    assert_equal(2, reviews.length)
  end

  def test_assignment_count
    changeset = Changeset.find(100)
    assert_equal(0, changeset.assignment_count)
    change = changeset.changes[0]
    change.code_review_assignments << CodeReviewAssignment.generate!(:issue_id => 1)
    change.code_review_assignments << CodeReviewAssignment.generate!(:issue_id => 2)
    change = changeset.changes[1]
    change.code_review_assignments << CodeReviewAssignment.generate!(:issue_id => 3)

    assert_equal(3, changeset.assignment_count)
  end

  def test_completed_assignment_pourcent
    changeset = Changeset.find(100)
    change = changeset.changes[0]
    change.code_review_assignments << CodeReviewAssignment.generate!(:issue_id => 1)
    change.code_review_assignments << CodeReviewAssignment.generate!(:issue_id => 2)
    change = changeset.changes[1]
    change.code_review_assignments << CodeReviewAssignment.generate!(:issue_id => 3)
    change.code_review_assignments << CodeReviewAssignment.generate!(:issue_id => 4)
    issues = []
    1.upto(4) {|i|
      issues[i - 1] = Issue.find(i)
      issues[i - 1].status_id = 1
      issues[i - 1].due_date = nil
      issues[i - 1].save!
    }
    changeset.save!
    assert_equal(0, changeset.completed_assignment_pourcent)
    issues[0].status_id = 5
    issues[0].save!
    changeset = Changeset.find(100)
    assert_equal(25, changeset.completed_assignment_pourcent)
    issues[1].done_ratio = 50
    issues[1].save!
    changeset = Changeset.find(100)
    assert_equal(37.5, changeset.completed_assignment_pourcent)
  end
end
