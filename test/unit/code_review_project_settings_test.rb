# Code Review plugin for Redmine
# Copyright (C) 2010-2012  Haruyuki Iida
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

class CodeReviewProjectSettingsTest < ActiveSupport::TestCase
  fixtures :code_review_project_settings, :projects, :users, :trackers

  # Replace this with your real tests.
  context "save" do
    setup do
      @setting = CodeReviewProjectSetting.new
    end

    should "return false if project_id is nil." do
      assert !@setting.save
    end

    should "return true if project_id is setted." do
      @setting.project_id = 1
      @setting.tracker_id = 1
      @setting.assignment_tracker_id = 1
      assert @setting.save
    end
  end

  context "auto_assign" do
    setup do
      CodeReviewProjectSetting.destroy_all
    end

    should "be saved if auto_assign is setted." do
      project = Project.find(1)
      setting = FactoryBot.create(:code_review_project_setting, project: project)
      id = setting.id
      assert !setting.auto_assign_settings.enabled?
      setting.auto_assign_settings.enabled = true
      assert setting.save
      setting = CodeReviewProjectSetting.find(id)
      assert setting.auto_assign_settings.enabled?
    end
  end

  context "issue_relation_type" do
    setup do
      @setting = CodeReviewProjectSetting.new
    end

    should "return IssueRelation::TYPE_RELATES if auto_relation is CodeReviewProjectSetting::AUTORELATION_TYPE_RELATES" do
      @setting.auto_relation = CodeReviewProjectSetting::AUTORELATION_TYPE_RELATES
      assert_equal(IssueRelation::TYPE_RELATES, @setting.issue_relation_type)
    end

    should "return IssueRelation::TYPE_BLOCKS if auto_relation is CodeReviewProjectSetting::AUTORELATION_TYPE_BLOCKS" do
      @setting.auto_relation = CodeReviewProjectSetting::AUTORELATION_TYPE_BLOCKS
      assert_equal(IssueRelation::TYPE_BLOCKS, @setting.issue_relation_type)
    end

    should "return nil if auto_relation is CodeReviewProjectSetting::AUTORELATION_TYPE_NONE" do
      @setting.auto_relation = CodeReviewProjectSetting::AUTORELATION_TYPE_NONE
      assert_nil(@setting.issue_relation_type)
    end

    should "return nil if auto_relation is nil" do
      @setting.auto_relation = nil
      assert_nil(@setting.issue_relation_type)
    end
  end

  context "auto_relation?" do
    setup do
      @setting = CodeReviewProjectSetting.new
    end

    should "return true if auto_relation is CodeReviewProjectSetting::AUTORELATION_TYPE_RELATES" do
      @setting.auto_relation = CodeReviewProjectSetting::AUTORELATION_TYPE_RELATES
      assert(@setting.issue_relation_type)
    end

    should "return true if auto_relation is CodeReviewProjectSetting::AUTORELATION_TYPE_BLOCKS" do
      @setting.auto_relation = CodeReviewProjectSetting::AUTORELATION_TYPE_BLOCKS
      assert(@setting.issue_relation_type)
    end

    should "return false if auto_relation is CodeReviewProjectSetting::AUTORELATION_TYPE_NONE" do
      @setting.auto_relation = CodeReviewProjectSetting::AUTORELATION_TYPE_NONE
      assert !(@setting.issue_relation_type)
    end

    should "return false if auto_relation is nil" do
      @setting.auto_relation = nil
      assert !(@setting.issue_relation_type)
    end
  end
end
