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
require 'repositories_controller'


class RepositoriesControllerTest < ActionController::TestCase
  fixtures :projects, :users, :roles, :members, :repositories, :issues, :issue_statuses, :changesets, :changes, :issue_categories, :enumerations, :custom_fields, :custom_values, :trackers
  
  def setup
    @controller = RepositoriesController.new
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
    enabled_module = EnabledModule.new
    enabled_module.project_id = 1
    enabled_module.name = 'repository'
    enabled_module.save
    project = Project.find(1)
    repo = Repository.find(10)
    project.repository = repo
    project.save

    User.current = nil
    roles = Role.find(:all)
    roles.each {|role|
      role.permissions << :view_code_review
      role.permissions << :add_code_review
      role.permissions << :browse_repository
      role.save
    }
  end

  def test_revision
    @request.session[:user_id] = 1
    change = Change.generate!
    changeset = change.changeset
    project = Project.find(1)
    project.repository.destroy
    project.repository = changeset.repository
    issue = Issue.generate_for_project!(project, {:description => 'test'})
    review = CodeReview.generate!(:change => change, :project => project, :issue => issue)
    get :revision, :id => project.id, :rev => changeset.revision, :path => change.path.split('/')
    #assert_response :success
    
  end

  def test_revisions
    @request.session[:user_id] = 1
    get :revisions, :id => 1
    assert_response :success
  end

  def test_show
    @request.session[:user_id] = 1
    get :show, :id => 1
    assert_response :success
  end
  
  def test_diff
    @request.session[:user_id] = 1
    #get :diff, :id => 1, :path => '/test/some/path/in/the/repo'.split('/')
    get :diff, :id => 1, :path => ['/'], :rev => 1
    #assert_response :success

  end

  def test_entry
    @request.session[:user_id] = 1
    get :entry, :id => 1, :path => ['/']
    assert_response :success
  end
end
