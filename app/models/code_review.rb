# Code Review plugin for Redmine
# Copyright (C) 2009  Haruyuki Iida
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
class CodeReview < ActiveRecord::Base
  belongs_to :project
  belongs_to :user
  belongs_to :change
  belongs_to :updated_by, :class_name => 'User', :foreign_key => 'updated_by_id'
  acts_as_tree

  validates_presence_of :comment
  validates_presence_of :project_id
  validates_presence_of :user_id
  validates_presence_of :change_id
  validates_presence_of :updated_by_id

  acts_as_event :title => Proc.new {|o| "#{l(:code_review)}: #{'#' + o.id.to_s}" },
                  :description => Proc.new {|o| "#{o.comment}"},
                  :datetime => :updated_at,
                  :author => :updated_by,
                  :type => 'code_review',
                  :url => Proc.new {|o| {:controller => 'code_review', :action => 'show', :id => o.project, :review_id => o.id} }

  acts_as_activity_provider :type => 'code_review',
                              :timestamp => "#{CodeReview.table_name}.updated_at",
                              :author_key => "#{CodeReview.table_name}.user_id",
                              :permission => :view_code_review,
                              :find_options => {:joins => "LEFT JOIN #{Project.table_name} ON #{Project.table_name}.id = #{CodeReview.table_name}.project_id"}



  STATUS_OPEN = 0
  STATUS_CLOSED = 1

  def is_closed?
    self.root.status == STATUS_CLOSED
  end

  def close
    self.root.status = STATUS_CLOSED
  end

  def reopen
    self.root.status = STATUS_OPEN
  end
end
