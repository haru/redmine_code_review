# Code Review plugin for Redmine
# Copyright (C) 2012-2017  Haruyuki Iida
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

class DeleteOldFields < ActiveRecord::Migration[4.2]
  OLD_FIELDS = ["old_parent_id", "old_user_id", "old_comment", "old_status"]
  def self.up
    remove_column(:code_reviews, "old_parent_id")
    remove_column(:code_reviews, "old_user_id")
    remove_column(:code_reviews, "old_comment")
    remove_column(:code_reviews, "old_status")
  end

  def self.down
    add_column(:code_reviews, "old_parent_id", :integer)
    add_column(:code_reviews, "old_user_id", :integer)
    add_column(:code_reviews, "old_comment", :text)
    add_column(:code_reviews, "old_status", :integer)
  end
end
