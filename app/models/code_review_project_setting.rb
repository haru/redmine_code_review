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
class CodeReviewProjectSetting < ActiveRecord::Base
  unloadable
  include Redmine::SafeAttributes
  include CodeReviewAutoAssignSettings

  belongs_to :project
  belongs_to :tracker
  belongs_to :assignment_tracker, :class_name => 'Tracker'

  validates_presence_of :project_id
  validates_presence_of :tracker_id
  validates_presence_of :assignment_tracker_id

  before_save :set_assignment_settings

  attr_accessible :tracker_id, :assignment_tracker_id, :hide_code_review_tab, :auto_relation, :tracker_in_review_dialog, :auto_assign

  AUTORELATION_TYPE_NONE = 0
  AUTORELATION_TYPE_RELATES = 1
  AUTORELATION_TYPE_BLOCKS = 2

  def self.find_for(project)
    where(project_id: project.id).first
  end

  def self.find_or_create(project)
    unless setting = find_for(project)
      setting = CodeReviewProjectSetting.new
      setting.project_id = project.id
      return setting if project.trackers.length == 0
      setting.tracker = project.trackers[0]
      setting.assignment_tracker = project.trackers[0]
      setting.save!
    end
    setting
  end

  def auto_assign_settings
    @auto_assign_settings ||= AutoAssignSettings.load(auto_assign)
  end

  def auto_assign_settings=(settings)
    @auto_assign_settings = settings
  end
  
  def issue_relation_type
    return IssueRelation::TYPE_RELATES if auto_relation == CodeReviewProjectSetting::AUTORELATION_TYPE_RELATES
    return IssueRelation::TYPE_BLOCKS if auto_relation == CodeReviewProjectSetting::AUTORELATION_TYPE_BLOCKS
    return nil
  end
  
  def auto_relation?
    issue_relation_type != nil
  end

  private
  def set_assignment_settings
    if auto_assign_settings
      self.auto_assign = auto_assign_settings.to_s
    else
      self.auto_assign = nil
    end
  end
end
