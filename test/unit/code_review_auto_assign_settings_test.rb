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
  fixtures :code_review_project_settings, :projects, :users, :trackers

  include CodeReviewAutoAssignSettings



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
end
