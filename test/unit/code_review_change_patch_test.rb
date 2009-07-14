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

class CodeReviewChangePatchTest < Test::Unit::TestCase
  fixtures :code_reviews, :projects, :users, :repositories, :changesets, :changes, :issues, :issue_statuses, :enumerations, :issue_categories, :trackers

  def test_review_count
    change = Change.find(2)
    assert_equal(2, change.review_count)
  end

  def test_open_review_count
    change = Change.find(2)
    assert_equal(2, change.open_review_count)
    issue = Issue.find(1)
    issue.status_id = 5
    issue.save
    change = Change.find(2)
    assert_equal(1, change.open_review_count)

  end

  def test_closed_review_count
    change = Change.find(2)
    assert_equal(0, change.closed_review_count)
    issue = Issue.find(1)
    issue.status_id = 5
    issue.save
    change = Change.find(2)
    assert_equal(1, change.closed_review_count)
  end
end
