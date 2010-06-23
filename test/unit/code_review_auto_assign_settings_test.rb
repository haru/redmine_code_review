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

class CodeReviewAtuoAssignSettingsTest < ActiveSupport::TestCase
  fixtures :code_review_project_settings, :projects, :users, :trackers, :repositories, :projects_trackers

  include CodeReviewAutoAssignSettings
  
  context "AutoAssignSettings" do
    context "to_s" do
      should "return string if @yml is not nil." do
      
        str =<<EOF
--- 
aaa: bbb
ccc: ccc
EOF
        settings = AutoAssignSettings.load(str)
        assert_equal(str, settings.to_s)
      end
    end

    context "enabled?" do
      setup do
        @settings = AutoAssignSettings.new
      end

      should "return false if enabled is not setted." do
        assert !@settings.enabled?
      end

      should "return true if enabled is setted to true." do
        @settings.enabled = true
        assert @settings.enabled?
      end

      should "return false if enabled is setted to false" do
        @settings.enabled = false
        assert !@settings.enabled?
      end
    end
    
    context "accept_for_default" do
      setup do
        @settings = AutoAssignSettings.new
      end

      should "return false if accept_for_default is not setted." do
        assert !@settings.accept_for_default
      end

      should "return true if accept_for_default is setted to true." do
        @settings.accept_for_default = true
        assert @settings.accept_for_default
      end

      should "return false if accept_for_default is setted to false" do
        @settings.accept_for_default = false
        assert !@settings.accept_for_default
      end
    end

    context "author_id" do
      setup do
        @settings = AutoAssignSettings.new
      end
    
      should "return 3 if author_id is 3" do
        @settings.author_id = 3
        assert_equal(3, @settings.author_id)
      end

      should "return 4 if author_id is '4'" do
        @settings.author_id = '4'
        assert_equal(4, @settings.author_id)
      end

      should "return nil if author_id is nil" do
        @settings.author_id = nil
        assert_equal(nil, @settings.author_id)
      end

      should "return nil if author_id is empty string" do
        @settings.author_id = ''
        assert_equal(nil, @settings.author_id)
      end
    end

    context "assignable?" do
      setup do
        @settings = AutoAssignSettings.new
      end
    
      should "return false if assignable_list is nil" do
        @settings.assignable_list = nil
        assert !@settings.assignable?(1)
      end

      should "return false if assignable_list is empty" do
        @settings.assignable_list = []
        assert !@settings.assignable?(1)
      end

      should "return false if assignable_list hasn't specified user_id" do
        @settings.assignable_list = [1,3,4,5]
        assert !@settings.assignable?(User.find(2))
      end

      should "return true if assignable_list has specified user_id" do
        @settings.assignable_list = [1,2,3,4]
        assert @settings.assignable?(User.find(3))
      end

      should "return true if assignable_list has specified user_id's string" do
        @settings.assignable_list = ["1","2","3","4"]
        assert @settings.assignable?(User.find(3))
      end
    end

    context "select_assign_to" do
      setup do
        @settings = AutoAssignSettings.new
        @project = Project.find(1)
      end
    
      should "return nil if assignable_list is nil" do
        @settings.assignable_list = nil
        assert_nil @settings.select_assign_to @project
      end

      should "return nil if assignable_list is empty" do
        @settings.assignable_list = []
        assert_nil @settings.select_assign_to(@project)
      end

      should "return user_id" do
        @settings.assignable_list = [1,2,3,4,5]
        assert_not_nil @settings.select_assign_to(@project)
      end

      should "not return id that equals user.id" do
        @settings.assignable_list = [1,2]
        user = User.find(1)
        assert_equal(2, @settings.select_assign_to(@project, user))
        @settings.assignable_list = [1]
        assert_nil(@settings.select_assign_to(@project, user))
      end

      should "return nil if assignable_list has no project member" do
        @settings.assignable_list = [51, 52, 53]
        assert_nil @settings.select_assign_to(@project)
      end
    end

    context "description" do
      setup do
        @settings = AutoAssignSettings.new
      end

      should "return nil if :description is nil." do
        @settings.description = nil
        assert_nil @settings.description
      end

      should "return 'abc' if :description is 'abc'." do
        @settings.description = 'abc'
        assert_equal 'abc', @settings.description
      end
    end

    context "subject" do
      setup do
        @settings = AutoAssignSettings.new
      end

      should "return 'efg' if :subject is 'efg'" do
        @settings.subject = 'efg'
        assert_equal('efg', @settings.subject)
      end

      should "return nil if :subject is nil" do
        @settings.subject = nil
        assert_nil(@settings.subject)
      end
    end

    context "filters" do
      setup do
        @settings = AutoAssignSettings.new
      end
      
      should "return empty array if :filters is nil" do
        @settings.filters = nil
        assert_equal(0, @settings.filters.length)
      end

      should "return filters" do
        filters = []
        filters << AssignmentFilter.new
        filters << AssignmentFilter.new
        @settings.filters = filters
        assert_equal(2, @settings.filters.length)
      end
    end
  end

  context "match_with_change?" do
    setup do
      @settings = AutoAssignSettings.new
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
      @settings.filters = filters
      @settings.accept_for_default = true

      project = Project.find(1)
      project.repository.destroy if project.repository
      repository = Repository.new
      repository.project = project
      @changeset = Changeset.generate!
      @changeset.repository = repository
    end

    should "return true if filters.length is 0 and accept_for_default is true." do
      @settings.filters = []
      change = Change.generate!(:changeset => @changeset)
      assert @settings.match_with_change?(change)
    end

    should "return true if filter matches and accept? is true" do
      @settings.accept_for_default = false
      change = Change.generate!(:path => '/aaa/bbb/ccc.rb', :changeset => @changeset)
      assert @settings.match_with_change?(change)
      change = Change.generate!(:path => '/trunk/plugins/redmine_code_review/lib/ccc.rb', :changeset => @changeset)
      assert @settings.match_with_change?(change)
    end

    should "return false if filter matches and accept? is false" do
      change = Change.generate!(:path => '/aaa/bbb/ccctest.rb', :changeset => @changeset)
      assert !@settings.match_with_change?(change)
    end

    should "return false if filter doesn't matches and accept_for_default is false" do
      change = Change.generate!(:path => '/aaa/bbb/ccctest.html', :changeset => @changeset)
      @settings.accept_for_default = false
      assert !@settings.match_with_change?(change)
    end

    should "return true if filter doesn't matches and accept_for_default is true" do
      change = Change.generate!(:path => '/aaa/bbb/ccctest.html', :changeset => @changeset)
      @settings.accept_for_default = true
      assert @settings.match_with_change?(change)
    end

    should "return false if filters.length is 0 and accept_for_default is false." do
      @settings.filters = []
      @settings.accept_for_default = false
      change = Change.generate!(:changeset => @changeset)
      assert !@settings.match_with_change?(change)
    end
  end

  context "AssignmentFilter" do
    setup do
      @filter = AssignmentFilter.new
    end

    context "accept?" do
      should "return true if @accept is true" do
        @filter.accept = true
        assert @filter.accept?
      end

      should "return false if @accept is false" do
        @filter.accept = false
        assert !@filter.accept?
      end

      should "return false if @accept is nil" do
        @filter.accept = nil
        assert !@filter.accept?
      end
    end

    context "attributes" do
      should "return hash" do
        @filter.accept = true
        @filter.expression = 'aaa'
        attrs = @filter.attributes
        assert attrs[:accept]
        assert_equal 'aaa', attrs[:expression]
      end
    end

    context "attributes=" do
      should "set attributes from hash" do
        hash = Hash.new
        hash[:accept] = true
        hash[:expression] = 'hoge'
        @filter.attributes = hash
        assert @filter.accept
        assert_equal 'hoge', @filter.expression
      end
    end

    context "match?" do
      should "return false if expression is nil" do
        @filter.expression = nil
        assert !@filter.match?("/aaa/bbb")
      end

      should "return false if path is nil" do
        @filter.expression = 'abc'
        assert !@filter.match?(nil)
      end

      should "return true if expression matches." do
        @filter.expression = '/aaa/.*\\.java$'
        assert @filter.match?("/test/aaa/bbb/foo.java")
      end

      should "return false if expression doesn't match." do
        @filter.expression = '.*\\.rb$'
        assert !@filter.match?("/test/aaa/bbb/foo.java")
      end
    end
  end

  context "filter_enabled?" do
    setup do
      @settings = AutoAssignSettings.new
    end

    should "return false if filter_enabled is nil" do
      @settings.filter_enabled = nil
      assert !@settings.filter_enabled?
    end

    should "return false if filter_enabled is false" do
      @settings.filter_enabled = false
      assert !@settings.filter_enabled?
    end

    should "return true if filter_enabled is true" do
      @settings.filter_enabled = true
      assert @settings.filter_enabled?
    end

    should "return true if filter_enabled is 'true'" do
      @settings.filter_enabled = 'true'
      assert @settings.filter_enabled?
    end
  end

end
