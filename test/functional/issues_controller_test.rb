# Code Review plugin for Redmine
# Copyright (C) 2009-2018  Haruyuki Iida
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
require 'issues_controller'

# Re-raise errors caught by the controller.
class IssuesController; def rescue_action(e) raise e end; end

class IssuesControllerTest < ActionController::TestCase
  fixtures :projects,
           :users,
           :roles,
           :members,
           :member_roles,
           :issues,
           :issue_statuses,
           :versions,
           :trackers,
           :projects_trackers,
           :issue_categories,
           :enabled_modules,
           :enumerations,
           :attachments,
           :workflows,
           :custom_fields,
           :custom_values,
           :custom_fields_trackers,
           :time_entries,
           :journals,
           :journal_details,
           :code_reviews,
           :code_review_assignments,
           :code_review_user_settings,
           :changes,
           :changesets,
           :repositories

  def setup
    @controller = IssuesController.new
    @request = ActionController::TestRequest.create(self.class.controller_class)
    User.current = nil
    enabled_module = EnabledModule.new
    enabled_module.project_id = 1
    enabled_module.name = 'code_review'
    enabled_module.save
    enabled_module = EnabledModule.new
    enabled_module.project_id = 2
    enabled_module.name = 'code_review'
    enabled_module.save
    roles = Role.all
    roles.each { |role|
      role.permissions << :view_code_review
      role.save
    }
  end

  def test_show
    @request.session[:user_id] = 1
    project = Project.find(1)
    issue = Issue.generate!(:project => project)
    get :show, params: {id: issue.id}

    assignment = FactoryBot.create(:code_review_assignment, issue: issue, rev: 'aaa', file_path: nil, change_id: 1)
    get :show, :params => {:id => assignment.issue.id}

    issue = Issue.generate!(:project => Project.find(1))
    assignment = FactoryBot.create(:code_review_assignment, issue: issue, rev: 'aaa', file_path: '/aaa/bbb')
    get :show, :params => {:id => assignment.issue.id}

    review = FactoryBot.create(:code_review, project: project)
    get :show, :params => {:id => review.issue.id}
  end

  def test_new
    @request.session[:user_id] = 1
    get :new, params: {project_id: 1}
    assert_response :success
    get :new, :params => {:project_id => 1, :code => {:rev => 1, :rev_to => 2, :path => '/aaa/bbb', :action_type => 'diff'}}
    assert_response :success
    post :new, :params => {:project_id => 1,
                        :issue => {:tracker_id => 1, :status_id => 1, :subject => 'hoge'},
                        :code => {:rev => 1, :rev_to => 2, :path => '/aaa/bbb', :action_type => 'diff'}}

    # TODO: 0.9.xのサポート終了時に以下を有効にする。
    #assert_response :SUCESS
  end

  context "create" do
    should "create code_review_assignment." do
      @request.session[:user_id] = 1
      project = Project.find(1)
      post :create, :params => {:project_id => 1, :issue => {:subject => 'test'}, :code => {:change_id => 1, :changeset_id => 1}}
      assert_response :redirect
    end
  end
end
