# Code Review plugin for Redmine
# Copyright (C) 2009-2015  Haruyuki Iida
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
require 'repositories_controller'

class RepositoriesControllerTest < ActionController::TestCase
  fixtures :projects, :users, :roles, :members, :member_roles, :repositories, :issues, :issue_statuses, :changesets,
           :changes, :issue_categories, :enumerations, :custom_fields, :custom_values, :trackers, :projects_trackers

  def setup
    @controller = RepositoriesController.new
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
    enabled_module = EnabledModule.new
    enabled_module.project_id = 1
    enabled_module.name = 'repository'
    enabled_module.save
    project = Project.find(1)
    repo = Repository.find(10)
    project.repository = repo
    project.save

    User.current = nil
    roles = Role.all
    roles.each { |role|
      role.permissions << :view_code_review
      role.permissions << :add_code_review
      role.permissions << :browse_repository
      role.save
    }
  end

  def test_revision
    @request.session[:user_id] = 1
    change = FactoryBot.create(:change)
    changeset = change.changeset
    project = Project.find(1)
    project.repository.destroy
    project.repository = changeset.repository
    issue = Issue.generate!({:project_id => project.id, :description => 'test', :tracker => Tracker.find(1), :status_id => 1})
    review = FactoryBot.create(:code_review, change: change, project: project, issue: issue)
    get :revision, :params => {:id => project.id, :rev => changeset.revision, :path => change.path.split('/'), repository_id: 1}
    #assert_response :success
  end

  def test_revisions
    @request.session[:user_id] = 1
    get :revisions, :params => {:id => 1, repository_id: 10}
    assert_response :success
  end

  def test_show
    @request.session[:user_id] = 1
    get :show, :params => {:id => 1}
    assert_response :success
  end

  def test_diff
    @request.session[:user_id] = 10
    get :diff, :params => {:id => 1, :path => '/subversion_test/helloworld.c'.split('/'), :rev => 8, repository_id: 10}
    #assert_response :success
  end

  def test_entry
    @request.session[:user_id] = 10
    get :entry, :params => {:id => 1, :path => '/subversion_test/helloworld.c'.split('/'), :rev => 8, repository_id: 10}
    assert_response :success
  end
end
