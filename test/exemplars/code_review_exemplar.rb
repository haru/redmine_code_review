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

class CodeReview < ActiveRecord::Base
  #generator_for :issue, :method => :next_issue
  #generator_for :subject, :method => :next_subject
  #generator_for :comment => 'Comment'
  generator_for :updated_by_id => 1
  generator_for :action_type => 'diff'
  generator_for :line => 30

  def self.next_subject
    @last_subject ||= 'Code Review 0'
    @last_subject.succ!
    @last_subject
  end
end
