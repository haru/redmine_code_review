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

class CodeReviewSettingsControllerTest < ActionController::TestCase
  fixtures :code_reviews, :projects, :users, :trackers, :projects, :projects_trackers,
    :code_review_project_settings, :issues, :issue_statuses, :enumerations

  def setup
    @controller = CodeReviewSettingsController.new
    @request    = ActionController::TestRequest.new
    @response   = ActionController::TestResponse.new
    @request.env["HTTP_REFERER"] = '/'
    enabled_module = EnabledModule.new
    enabled_module.project_id = 1
    enabled_module.name = 'code_review'
    enabled_module.save

    enabled_module = EnabledModule.new
    enabled_module.project_id = 2
    enabled_module.name = 'code_review'
    enabled_module.save

    User.current = nil
    roles = Role.find(:all)
    roles.each {|role|
      role.permissions << :view_code_review
      role.save
    }
  end


  context "update" do
    setup do
      @request.session[:user_id] = 1
    end

    should "return 302 if user is anonymous" do
      @request.session[:user_id] = User.anonymous.id
      get :update, :id => 1
      assert_response 302
    end

    should "save settings" do

      @request.session[:user_id] = 1
      setting = CodeReviewProjectSetting.find(1)

      post :update, :id => 1, :setting => {:tracker_id => 2, :assignment_tracker_id => 3},
        :auto_assign => {:filters => {:a => 1}}
      assert_response :redirect
      project = Project.find(1)
      assert_redirected_to :controller => 'projects', :action => 'settings', :id => project, :tab => 'code_review'

      setting = assigns(:setting)
      assert_equal(1, setting.updated_by)
      assert_equal(project.id, setting.project_id)
      assert_equal(2, setting.tracker_id)
      assert_equal(3, setting.assignment_tracker_id)

      get :update, :id => 1, :setting => {:tracker_id => 1, :id => setting.id}, :convert => 'true',
        :auto_assign => {}
      assert_response :redirect
      project = Project.find(1)
      assert_redirected_to :controller => 'projects', :action => 'settings', :id => project, :tab => 'code_review'

      post :update, :id => 2, :setting => {:tracker_id => 1, :assignment_tracker_id => 1}, :auto_assign => {}
      assert_response :redirect
      project = Project.find(2)
      assert_redirected_to :controller => 'projects', :action => 'settings', :id => project, :tab => 'code_review'
    end
  end

  def test_convert
    setting = CodeReviewProjectSetting.find(1)
    @request.session[:user_id] = User.anonymous.id
    get :update, :id => 1, :setting => {:tracker_id => 1, :id => setting.id},
      :convert => true
    assert_response :redirect
  end
end
