# Code Review plugin for Redmine
# Copyright (C) 2009-2017  Haruyuki Iida
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

class LinkToIssue < ActiveRecord::Migration[4.2]
  def self.up
    add_column(:code_reviews, "issue_id", :integer)
    rename_column(:code_reviews, "status", "old_status")
    rename_column(:code_reviews, "comment", "old_comment")
    rename_column(:code_reviews, "parent_id", "old_parent_id")
  end

  def self.down
    remove_column(:code_reviews, "issue_id")
    rename_column(:code_reviews, "old_status", "status")
    rename_column(:code_reviews, "old_comment", "comment")
    rename_column(:code_reviews, "old_parent_id", "parent_id")
  end
end
