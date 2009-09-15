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

begin
require_dependency 'application'
rescue LoadError
end
require_dependency 'repositories_controller'

module CodeReviewRepositoriesControllerPatch
  def self.included(base) # :nodoc:
    base.send(:include, RepositoriesControllerInstanceMethodsCodeReview)

    base.class_eval do
      unloadable # Send unloadable so it will not be unloaded in development      
    end

  end
end

module RepositoriesControllerInstanceMethodsCodeReview
  def get_selected_changesets
    return @changesets if @changesets
    if @changeset
      [@changeset]
    end
  end
end

RepositoriesController.send(:include, CodeReviewRepositoriesControllerPatch)
