# Code Review plugin for Redmine
# Copyright (C) 2009-2014  Haruyuki Iida
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
require File.expand_path(File.dirname(__FILE__) + '/../test_helper')
require 'code_review_attachment_patch'

class CodeReviewAttachmentPatchTest < ActiveSupport::TestCase
  fixtures :code_reviews, :projects, :users, :repositories, :changesets, :changes, :attachments,
    :issues, :issue_statuses, :enumerations, :issue_categories, :trackers, :code_review_assignments

  def setup
    @project = Project.find(1)
    @issue = Issue.where(:project_id => 1).first
    @attachment = FactoryBot.create(:attachment, container: @issue)
  end

  context "code_review_assginments" do
    should "returns empty array if attachment has no assignments" do
      assert_not_nil(@attachment.code_review_assignments)
      assert_equal(0, @attachment.code_review_assignments.length)
    end

    should "returns 1 assignment if attachment has one assignment" do
      assignment = CodeReviewAssignment.new
      assignment.issue = @issue
      assignment.attachment = @attachment
      assignment.save!
      assert_not_nil(@attachment.code_review_assignments)
      assert_equal(1, @attachment.code_review_assignments.length)
    end
  end
end
