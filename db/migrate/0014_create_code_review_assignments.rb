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

class CreateCodeReviewAssignments < ActiveRecord::Migration
  def self.up
    create_table :code_review_assignments do |t|

      t.column :issue_id, :int

      t.column :change_id, :int

      t.column :attachment_id, :int

      t.column :file_path, :string

      t.column :rev, :string

      t.column :rev_to, :string

      t.column :action_type, :string

    end
  end

  def self.down
    drop_table :code_review_assignments
  end
end
