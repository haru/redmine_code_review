# Code Review plugin for Redmine
# Copyright (C) 2010  Haruyuki Iida
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

class CodeReviewAssignmentTest < ActiveSupport::TestCase
  fixtures :code_review_assignments, :issues, :issue_statuses

  context "is_closed?" do
    should "return false if assignment issue is not closed." do
      assignment = CodeReviewAssignment.generate
      assert !assignment.is_closed?
    end

    should "return true if assignment issue is closed." do
      assignment = CodeReviewAssignment.generate
      assignment.issue.status = IssueStatus.find(5)
      assert assignment.is_closed?
    end
  end

  context "path" do
    should "return nil if file_path is nil." do
      assignment = CodeReviewAssignment.generate(:file_path => nil)
      assert_nil assignment.path
    end

    should "return aaa if file_path is aaa" do
      assignment = CodeReviewAssignment.generate(:file_path => 'aaa')
      assert_equal('aaa', assignment.path)
    end
  end

  context "revision" do
    should "return '123' if rev is '123'" do
      assignment = CodeReviewAssignment.generate(:rev => '123')
      assert_equal('123', assignment.revision)
    end

    should "return '456' if rev is nil and changeset.revision is '456'" do
      changeset = Changeset.generate(:revision => '456')
      assignment = CodeReviewAssignment.generate(:rev => nil, :changeset => changeset)
      assert_equal('456', assignment.revision)
    end

    should "return nil if rev and chageset are nil" do
      assignment = CodeReviewAssignment.generate(:rev => nil, :changeset => nil)
      assert_nil(assignment.revision)
    end
  end

end
