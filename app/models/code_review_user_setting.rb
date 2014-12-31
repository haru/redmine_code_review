# Code Review plugin for Redmine
# Copyright (C) 2011  Haruyuki Iida
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
class CodeReviewUserSetting < ActiveRecord::Base
  unloadable
  belongs_to :user

  validates_presence_of :user_id
  validates_presence_of :mail_notification
  validates_uniqueness_of :user_id

  NOTIFCIATION_NONE = 0
  NOTIFICATION_INVOLVED_IN = 1
  NOTIFICATION_ALL = 2

  def CodeReviewUserSetting.find_or_create(uid)
    setting = CodeReviewUserSetting.find_by(user_id: uid)
    return setting if setting
    setting = CodeReviewUserSetting.new
    setting.user_id = uid
    setting.mail_notification = NOTIFICATION_INVOLVED_IN
    setting.save
    return setting
  end

  def mail_notification_none?
    mail_notification == NOTIFCIATION_NONE
  end

  def mail_notification_involved_in?
    mail_notification == NOTIFICATION_INVOLVED_IN
  end

  def mail_notification_all?
    mail_notification == NOTIFICATION_ALL
  end
end
