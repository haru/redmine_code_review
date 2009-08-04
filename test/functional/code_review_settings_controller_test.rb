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

class CodeReviewSettingsControllerTest < ActionController::TestCase
  fixtures :code_reviews, :projects, :users, :trackers, :projects, :projects_trackers,
    :code_review_project_settings, :issues

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


  def test_update
    @request.session[:user_id] = User.anonymous.id
    get :update, :id => 1
    assert_response 302

    @request.session[:user_id] = 1
    setting = CodeReviewProjectSetting.find(1)
    get :update, :id => 1, :setting => {:tracker_id => 1, :id => setting.id}
    assert_response :redirect
    project = Project.find(1)
    assert_redirected_to :controller => 'projects', :action => 'settings', :id => project, :tab => 'code_review'

    get :update, :id => 1, :setting => {:tracker_id => 1, :id => setting.id}, :convert => 'true'
    assert_response :redirect
    project = Project.find(1)
    assert_redirected_to :controller => 'projects', :action => 'settings', :id => project, :tab => 'code_review'

    get :update, :id => 2, :setting => {:tracker_id => 1, :id => setting.id}
    assert_response :redirect
    project = Project.find(2)
    assert_redirected_to :controller => 'projects', :action => 'settings', :id => project, :tab => 'code_review'
  end

  def test_convert
    setting = CodeReviewProjectSetting.find(1)
    @request.session[:user_id] = User.anonymous.id
    get :update, :id => 1, :setting => {:tracker_id => 1, :id => setting.id},
      :convert => true
    assert_response :redirect
  end
end
