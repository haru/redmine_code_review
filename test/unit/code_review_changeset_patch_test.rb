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
require File.expand_path(File.dirname(__FILE__) + '/../test_helper')

class CodeReviewChangesetPatchTest < ActiveSupport::TestCase
  fixtures :code_reviews, :projects, :users, :repositories,
    :changesets, :changes, :members, :roles, :issues, :issue_statuses,
    :enumerations, :issue_categories, :trackers, :projects, :projects_trackers,
    :code_review_project_settings, :attachments, :code_review_assignments,
    :code_review_user_settings

  include CodeReviewAutoAssignSettings

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
    change = changeset.filechanges[0]
    change.code_review_assignments << FactoryGirl.create(:code_review_assignment, issue_id: 1)
    change.code_review_assignments << FactoryGirl.create(:code_review_assignment, issue_id: 2)
    change = changeset.filechanges[1]
    change.code_review_assignments << FactoryGirl.create(:code_review_assignment, issue_id: 3)

    assert_equal(3, changeset.assignment_count)
  end

  def test_completed_assignment_pourcent
    changeset = FactoryGirl.create(:changeset)
    FactoryGirl.create(:change, changeset: changeset)
    FactoryGirl.create(:change, changeset: changeset)
    
    changeset = Changeset.find(changeset.id)
    change = changeset.filechanges[0]
    change.code_review_assignments << FactoryGirl.create(:code_review_assignment, issue_id: 1)
    change.code_review_assignments << FactoryGirl.create(:code_review_assignment, issue_id: 2)
    change = changeset.filechanges[1]
    change.code_review_assignments << FactoryGirl.create(:code_review_assignment, issue_id: 3)
    change.code_review_assignments << FactoryGirl.create(:code_review_assignment, issue_id: 4)
    issues = []
    1.upto(4) {|i|
      issues[i - 1] = Issue.find(i)
      issues[i - 1].status_id = 1
      issues[i - 1].due_date = nil
      issues[i - 1].done_ratio = 0
      issues[i - 1].save!
    }
    changeset.save!
    changeset = Changeset.find(changeset.id)
    assert_equal(0, changeset.completed_assignment_pourcent)
    issues[0].status_id = 5
    issues[0].save!
    assert issues[0].closed?
    changeset = Changeset.find(changeset.id)
    assert_equal(25, changeset.completed_assignment_pourcent)
    issues[1].done_ratio = 50
    issues[1].save!
    changeset = Changeset.find(changeset.id)
    assert_equal(37.5, changeset.completed_assignment_pourcent)
  end

  context "closed_assignment_pourcent" do

    should "returns 0 if changeset has no assignments." do
      change = FactoryGirl.create(:change)
      changeset = change.changeset
      assert_equal(0, changeset.closed_assignment_pourcent)
    end

    should "returns 0 if changeset has no closed assignments." do
      change = FactoryGirl.create(:change)
      changeset = change.changeset
      @project = Project.generate!
      issue1 = Issue.generate!({:project => @project, :status_id => 1})
      issue2 = Issue.generate!({:project => @project, :status_id => 1})
      change.code_review_assignments << FactoryGirl.create(:code_review_assignment, issue: issue1)
      change.code_review_assignments << FactoryGirl.create(:code_review_assignment, issue: issue2)
      change.save!
      assert_equal(0, changeset.closed_assignment_pourcent)
    end

    should "returns 100 if changeset has no closed assignments." do
      change = FactoryGirl.create(:change)
      changeset = change.changeset
      @project = Project.find(1)
      issue1 = Issue.generate!({:project => @project, :status => IssueStatus.find(5)})
      issue1.status = IssueStatus.find(5);
      issue2 = Issue.generate!({:project => @project, :status => IssueStatus.find(5)})
      issue2.status = IssueStatus.find(5);
      change.code_review_assignments << FactoryGirl.create(:code_review_assignment, issue: issue1)
      change.code_review_assignments << FactoryGirl.create(:code_review_assignment, issue: issue2)
      change.save!
      changeset =Changeset.find(changeset.id)
      assert issue1.closed?
      assert issue2.closed?
      assert_equal(2, changeset.assignment_count)
      assert_equal(100, changeset.closed_assignment_pourcent)
    end

    should "returns 50 if half of assignments were closed." do
      change = FactoryGirl.create(:change)
      changeset = change.changeset
      @project = Project.generate!
      issue1 = Issue.generate!({:project => @project, :status => IssueStatus.find(5)})
      issue2 = Issue.generate!({:project => @project, :status => IssueStatus.find(1)})
      issue3 = Issue.generate!({:project => @project, :status => IssueStatus.find(5)})
      issue4 = Issue.generate!({:project => @project, :status => IssueStatus.find(1)})
      change.code_review_assignments << FactoryGirl.create(:code_review_assignment, issue: issue1)
      change.code_review_assignments << FactoryGirl.create(:code_review_assignment, issue: issue2)
      change.save!
      change = FactoryGirl.create(:change, changeset: changeset)
      change.code_review_assignments << FactoryGirl.create(:code_review_assignment, issue: issue3)
      change.code_review_assignments << FactoryGirl.create(:code_review_assignment, issue: issue4)
      change.save!
      assert_equal(50, changeset.closed_assignment_pourcent)
    end
  end

  context "assignment_issues" do
    should "returns empty array if changeset has no assignments." do
      change = FactoryGirl.create(:change)
      changeset = change.changeset
      assert_not_nil(changeset.assignment_issues)
    end

    should "returns assignments if changeset has assignments." do
      change = FactoryGirl.create(:change)
      changeset = change.changeset

      assert_not_nil change
      change.code_review_assignments << FactoryGirl.create(:code_review_assignment, issue_id: 1)
      change.code_review_assignments << FactoryGirl.create(:code_review_assignment, issue_id: 2)
      change.save!

      changeset = Changeset.find(changeset.id)
      assert_not_nil(changeset.assignment_issues)
      assert_equal(2, changeset.assignment_issues.length)

      change = FactoryGirl.create(:change, changeset: changeset)

      change.code_review_assignments << FactoryGirl.create(:code_review_assignment, issue_id: 3)
      change.save!

      changeset = Changeset.find(changeset.id)
      assert_not_nil change
      assert_not_nil(changeset.assignment_issues)
      assert_equal(3, changeset.assignment_issues.length)
    end
    
  end

  context "after_save" do
    setup do
      project = Project.find(1)
      setting = CodeReviewProjectSetting.find_or_create(project)

      repository = project.repository

      @changeset = FactoryGirl.create(:changeset, repository: repository)
      
      auto_assign = AutoAssignSettings.new
      auto_assign.enabled = true
      filters = []
      filter = AssignmentFilter.new
      filter.accept = false
      filter.expression = '.*test\\.rb$'
      filters << filter
      filter = AssignmentFilter.new
      filter.accept = true
      filter.expression = '.*\\.rb$'
      filters << filter
      filter = AssignmentFilter.new
      filter.accept = true
      filter.expression = '.*/redmine_code_review/.*'
      filters << filter
      auto_assign.filters = filters
      auto_assign.accept_for_default = true
      auto_assign.author_id = 1
      setting.auto_assign_settings = auto_assign
      setting.tracker = project.trackers[0]
      setting.assignment_tracker = project.trackers[0]
      setting.save!
    end

    should "create assignments" do
      count = CodeReviewAssignment.all.length
      change1 = FactoryGirl.create(:change, path: '/aaa/bbb/ccc.rb', changeset: @changeset)
      assert_equal(count + 1, CodeReviewAssignment.all.length)
      change2 = FactoryGirl.create(:change, path: '/aaa/bbb/ccc2.rb', changeset: @changeset)
      assert_equal(count + 1, CodeReviewAssignment.all.length)
    end
  end
end
