# Code Review plugin for Redmine
# Copyright (C) 2009-2010  Haruyuki Iida
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
require 'issues_controller'

# Re-raise errors caught by the controller.
class IssuesController; def rescue_action(e) raise e end; end

class IssuesControllerTest < ActionController::TestCase
  fixtures :projects,
           :users,
           :roles,
           :members,
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
           :code_reviews
  
  def setup
    @controller = IssuesController.new
    @request    = ActionController::TestRequest.new
    @response   = ActionController::TestResponse.new
    User.current = nil
    enabled_module = EnabledModule.new
    enabled_module.project_id = 1
    enabled_module.name = 'code_review'
    enabled_module.save
    enabled_module = EnabledModule.new
    enabled_module.project_id = 2
    enabled_module.name = 'code_review'
    enabled_module.save
    roles = Role.find(:all)
    roles.each {|role|
      role.permissions << :view_code_review
      role.save
    }
  end

  def test_show
    @request.session[:user_id] = 1
    project = Project.find(1)
    issue = Issue.generate_for_project!(project)
    get :show, :id => issue.id

    issue = Issue.generate_for_project!(project)
    assignment = CodeReviewAssignment.generate!(:issue => issue, :rev => 'aaa', :file_path => nil)
    get :show, :id => assignment.issue.id

    issue = Issue.generate_for_project!(Project.find(1))
    assignment = CodeReviewAssignment.generate!(:issue => issue, :rev => 'aaa', :file_path => '/aaa/bbb')
    get :show, :id => assignment.issue.id

  end

  def test_new
    @request.session[:user_id] = 1
    get :new, :project_id => 1
    assert_response :success
    get :new, :project_id => 1, :code =>{:rev => 1, :rev_to => 2, :path => '/aaa/bbb', :action_type => 'diff'}
    assert_response :success
    post :new, :project_id => 1,
      :issue => {:tracker_id => 1, :status_id => 1, :subject => 'hoge'},
      :code =>{:rev => 1, :rev_to => 2, :path => '/aaa/bbb', :action_type => 'diff'}

    # TODO: 0.9.xのサポート終了時に以下を有効にする。
    #assert_response :SUCESS
  end
end
