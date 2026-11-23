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
require File.expand_path(File.dirname(__FILE__) + "/../test_helper")

class CodeReviewSettingsControllerTest < ActionController::TestCase
  fixtures :code_reviews, :projects, :users, :trackers, :projects, :projects_trackers,
    :code_review_project_settings, :issues, :issue_statuses, :enumerations

  include CodeReviewAutoAssignSettings

  def setup
    @controller = CodeReviewSettingsController.new
    @request = ActionController::TestRequest.create(self.class.controller_class)
    @request.env["HTTP_REFERER"] = "/"
    enabled_module = EnabledModule.new
    enabled_module.project_id = 1
    enabled_module.name = "code_review"
    enabled_module.save

    enabled_module = EnabledModule.new
    enabled_module.project_id = 2
    enabled_module.name = "code_review"
    enabled_module.save

    User.current = nil
    roles = Role.all
    roles.each { |role|
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
      get :update, params: { id: 1 }
      assert_response :found
    end

    should "save settings" do
      @request.session[:user_id] = 1

      post :update, params: { id: 1, setting: { tracker_id: 2, assignment_tracker_id: 3,
                                                    hide_code_review_tab: true, auto_relation: CodeReviewProjectSetting::AUTORELATION_TYPE_BLOCKS },
                             auto_assign: { filters: { a: 1 } } }
      assert_response :redirect
      project = Project.find(1)
      assert_redirected_to controller: "projects", action: "settings", id: project, tab: "code_review"

      setting = assigns(:setting)
      assert_equal(1, setting.updated_by)
      assert_equal(project.id, setting.project_id)
      assert_equal(2, setting.tracker_id)
      assert_equal(3, setting.assignment_tracker_id)
      assert_equal(true, setting.hide_code_review_tab)
      assert_equal(CodeReviewProjectSetting::AUTORELATION_TYPE_BLOCKS, setting.auto_relation)

      get :update, params: { id: 1, setting: { tracker_id: 1, id: setting.id }, convert: "true",
                             auto_assign: {} }
      assert_response :redirect
      project = Project.find(1)
      assert_redirected_to controller: "projects", action: "settings", id: project, tab: "code_review"

      post :update, params: { id: 2, setting: { tracker_id: 1, assignment_tracker_id: 1 }, auto_assign: {} }
      assert_response :redirect
      project = Project.find(2)
      assert_redirected_to controller: "projects", action: "settings", id: project, tab: "code_review"
    end
  end

  context "add_filter" do
    setup do
      @project = Project.find(1)
      @request.session[:user_id] = 1
      @setting = CodeReviewProjectSetting.find_or_create(@project)
      @setting.auto_assign = AutoAssignSettings.new
    end

    should "add filter" do
      count = @setting.auto_assign_settings.filters.length
      filter = AssignmentFilter.new
      filter.expression = "aaa"
      filter.order = 10
      filter.accept = true
      post :add_filter, params: { id: @project.id, auto_assign: @setting.auto_assign_settings.attributes.merge({ add_filter: filter.attributes }) }
      @auto_assign = assigns(:auto_assign)
      assert_not_nil @auto_assign
      assert_equal(count + 1, @auto_assign.filters.length)
      assert_response :success
    end
  end

  context "edit_filter" do
    setup do
      @project = Project.find(1)
      @request.session[:user_id] = 1
      @setting = CodeReviewProjectSetting.find_or_create(@project)
      @setting.auto_assign = AutoAssignSettings.new
    end

    should "update filter" do
      filter = AssignmentFilter.new
      filter.expression = "aaa"
      filter.order = 10
      filter.accept = true

      filter2 = AssignmentFilter.new
      filter2.expression = "bbb"
      filter2.order = 10
      filter2.accept = false

      post :edit_filter, params: { id: @project.id, auto_assign: @setting.auto_assign_settings.attributes.merge(filters: { "0" => filter.attributes }), num: 0,
                                  auto_assign_edit_filter: { "0" => filter2.attributes } }
      @auto_assign = assigns(:auto_assign)
      assert_not_nil @auto_assign
      assert_equal(1, @auto_assign.filters.length)
      assert_response :success
    end

    should "keep the other filters unchanged" do
      first = AssignmentFilter.new
      first.expression = "aaa"
      first.order = 10
      first.accept = true
      second = AssignmentFilter.new
      second.expression = "bbb"
      second.order = 20
      second.accept = false
      post :edit_filter, params: { id: @project.id, auto_assign: @setting.auto_assign_settings.attributes.merge(filters: { "0" => first.attributes, "1" => second.attributes }), num: 1,
                                  auto_assign_edit_filter: { "1" => { expression: "ccc", order: 20, accept: true } } }
      assert_equal([ "aaa", "ccc" ], assigns(:auto_assign).filters.map(&:expression))
    end

    should "keep the filter block enabled" do
      filter = AssignmentFilter.new
      filter.expression = "aaa"
      filter.order = 10
      filter.accept = true
      post :edit_filter, params: { id: @project.id, auto_assign: @setting.auto_assign_settings.attributes.merge(filters: { "0" => filter.attributes }), num: 0,
                                  auto_assign_edit_filter: { "0" => filter.attributes } }
      assert assigns(:auto_assign).filter_enabled?
      assert_select "input#auto_assign_filter_enabled[checked]"
    end

    should "reject a row number that is outside the submitted filters" do
      filter = AssignmentFilter.new
      filter.expression = "aaa"
      filter.order = 10
      filter.accept = true
      post :edit_filter, params: { id: @project.id, auto_assign: @setting.auto_assign_settings.attributes.merge(filters: { "0" => filter.attributes }), num: 1,
                                  auto_assign_edit_filter: { "1" => filter.attributes } }
      assert_response :bad_request
    end

    # to_i would turn "abc" into 0 and overwrite the first row with the submitted edit.
    [ "abc", "-1", "", "1.5" ].each do |num|
      should "reject the malformed row number #{num.inspect}" do
        filter = AssignmentFilter.new
        filter.expression = "aaa"
        filter.order = 10
        filter.accept = true
        post :edit_filter, params: { id: @project.id, auto_assign: @setting.auto_assign_settings.attributes.merge(filters: { "0" => filter.attributes }), num: num,
                                    auto_assign_edit_filter: { "0" => filter.attributes } }
        assert_response :bad_request
      end
    end
  end

  context "sort" do
    setup do
      @project = Project.find(1)
      @request.session[:user_id] = 1
      @setting = CodeReviewProjectSetting.find_or_create(@project)
      @setting.auto_assign = AutoAssignSettings.new

      @filters = {}
      filter = AssignmentFilter.new
      filter.expression = "aaa"
      filter.order = 10
      filter.accept = true

      filter2 = AssignmentFilter.new
      filter2.expression = "bbb"
      filter2.order = 20
      filter2.accept = false

      filter3 = AssignmentFilter.new
      filter3.expression = "ccc"
      filter3.order = 30
      filter3.accept = false

      @filters["1"] = filter.attributes
      @filters["2"] = filter2.attributes
      @filters["3"] = filter2.attributes
    end

    should "sort filters" do
      post :sort, params: { id: @project.id, auto_assign: @setting.auto_assign_settings.attributes.merge(filters: @filters), num: 0,
                           auto_assign_filter: { num: 2, move_to: "highest" } }
      @auto_assign = assigns(:auto_assign)
      assert_not_nil @auto_assign
      assert_response :success

      post :sort, params: { id: @project.id, auto_assign: @setting.auto_assign_settings.attributes.merge(filters: @filters), num: 0,
                           auto_assign_filter: { num: 2, move_to: "higher" } }
      @auto_assign = assigns(:auto_assign)
      assert_not_nil @auto_assign
      assert_response :success

      post :sort, params: { id: @project.id, auto_assign: @setting.auto_assign_settings.attributes.merge(filters: @filters), num: 0,
                           auto_assign_filter: { num: 2, move_to: "lowest" } }
      @auto_assign = assigns(:auto_assign)
      assert_not_nil @auto_assign
      assert_response :success

      post :sort, params: { id: @project.id, auto_assign: @setting.auto_assign_settings.attributes.merge(filters: @filters), num: 0,
                           auto_assign_filter: { num: 2, move_to: "lower" } }
      @auto_assign = assigns(:auto_assign)
      assert_not_nil @auto_assign
      assert_response :success
    end

    should "reject a row number that does not exist" do
      post :sort, params: { id: @project.id, auto_assign: @setting.auto_assign_settings.attributes.merge(filters: @filters),
                           auto_assign_filter: { num: 9, move_to: "highest" } }
      assert_response :bad_request
    end

    # to_i would turn "abc" into 0 and Ruby's filters[-1] picks the last row, so both
    # would silently reorder a real filter instead of being rejected.
    [ "abc", "-1", "", "1.5" ].each do |num|
      should "reject the malformed row number #{num.inspect}" do
        post :sort, params: { id: @project.id, auto_assign: @setting.auto_assign_settings.attributes.merge(filters: @filters),
                             auto_assign_filter: { num: num, move_to: "highest" } }
        assert_response :bad_request
      end
    end

    should "keep the filter block enabled" do
      post :sort, params: { id: @project.id, auto_assign: @setting.auto_assign_settings.attributes.merge(filters: @filters),
                           auto_assign_filter: { num: 1, move_to: "highest" } }
      assert assigns(:auto_assign).filter_enabled?
      assert_select "input#auto_assign_filter_enabled[checked]"
    end

    # The form is serialized as a whole, so repeated hidden fields would all be sent and
    # only the last one would win: the arrows would always move the last filter.
    should "render one pair of sort fields and let each arrow pass its own row number" do
      post :sort, params: { id: @project.id, auto_assign: @setting.auto_assign_settings.attributes.merge(filters: @filters),
                           auto_assign_filter: { num: 0, move_to: "highest" } }
      assert_select "input[name=?]", "auto_assign_filter[num]", 1
      assert_select "input[name=?]", "auto_assign_filter[move_to]", 1
      assert_select "#auto_assign_tr_1 a[onclick*=cr_sort_filter]", 4 do |links|
        links.each { |link| assert_match(/, 1\)\z/, link["onclick"]) }
      end
    end
  end
end
