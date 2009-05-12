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
require 'redmine'
require 'code_review_application_hooks'


Redmine::Plugin.register :redmine_code_review do
  name 'Redmine Code Review plugin'
  author 'Haruyuki Iida'
  url "http://www.r-labs.org/projects/show/r-labs" if respond_to?(:url)
  description 'This is a Code Review plugin for Redmine'
  version '0.1.2'
  requires_redmine :version_or_higher => '0.8.0'

  project_module :code_review do
    permission :view_code_review, {:code_review => [:update_diff_view, :index, :show]}
    permission :add_code_review, {:code_review => [:new, :reply]}, :require => :member
    permission :edit_code_review, {:code_review => [:update]}, :require => :member
    permission :delete_code_review, {:code_review => [:destroy]}, :require => :member
    permission :close_code_review, {:code_review => [:close, :reopen]}, :require => :member

  end

  menu :project_menu, :code_review, { :controller => 'code_review', :action => 'index' }, :caption => :code_reviews,
    :if => Proc.new{|project| project.repository != nil}, :after => :repository

  activity_provider :code_review, :class_name => 'CodeReview', :default => false

end
