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

require_dependency 'change'

module CodeReviewChangePatch
  def self.included(base) # :nodoc:
    base.send(:include, ChangeInstanceMethodsCodeReview)

    base.class_eval do
      unloadable # Send unloadable so it will not be unloaded in development
      has_many :code_reviews, :dependent => :destroy
      
    end

  end
end

module ChangeInstanceMethodsCodeReview
  def review_count
    code_reviews.select{|o|
      o.issue_id != nil
    }.length
  end

  def open_review_count
    open_reviews = code_reviews.select { |o| 
      o.issue_id != nil and !o.is_closed?
    }
    open_reviews.length
  end

  def closed_review_count
    code_reviews.select { |o| o.issue_id != nil and o.is_closed? }.length
  end
end

Change.send(:include, CodeReviewChangePatch)
