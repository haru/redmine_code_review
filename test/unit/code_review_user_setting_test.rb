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

class CodeReviewUserSettingTest < ActiveSupport::TestCase
  fixtures :code_review_user_settings, :projects, :users

  # Replace this with your real tests.
  def test_find_or_create
    setting = CodeReviewUserSetting.find_or_create(2)

    assert_equal(2, setting.user_id)
    assert_equal(2, setting.mail_notification)

    assert !CodeReviewUserSetting.find_by(user_id: 9)
    setting = CodeReviewUserSetting.find_or_create(9)
    assert_equal(9, setting.user_id)
    assert_equal(CodeReviewUserSetting::NOTIFICATION_INVOLVED_IN, setting.mail_notification)
    setting.destroy
  end

  def test_mail_notification_none?
    setting = CodeReviewUserSetting.find_by(user_id: 3)
    assert setting.mail_notification_none?
    assert !setting.mail_notification_involved_in?
    assert !setting.mail_notification_all?
  end

  def test_mail_notification_involved_in?
    setting = CodeReviewUserSetting.find_by(user_id: 1)
    assert !setting.mail_notification_none?
    assert setting.mail_notification_involved_in?
    assert !setting.mail_notification_all?
  end

  def test_mail_notification_all?
    setting = CodeReviewUserSetting.find_by(user_id: 2)
    assert !setting.mail_notification_none?
    assert !setting.mail_notification_involved_in?
    assert setting.mail_notification_all?
  end
end
