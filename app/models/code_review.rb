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
require 'user'
require 'changeset'
require 'change'
class CodeReview < ActiveRecord::Base
  unloadable
  belongs_to :project
  belongs_to :user
  #belongs_to :change
  belongs_to :updated_by, :class_name => 'User', :foreign_key => 'updated_by_id'
  acts_as_tree

  validates_presence_of :comment
  validates_presence_of :project_id
  validates_presence_of :user_id
  validates_presence_of :change_id
  validates_presence_of :updated_by_id

  acts_as_event :title => Proc.new {|o|
                       title = "#{l(:code_review)}: #{'#' + o.root.id.to_s}"
                       title += ": #{l(:label_reply_plural)}" if o.parent and o.status_changed_from == nil
                       title += "(#{l(:label_review_closed)})" if o.status_changed_to == STATUS_CLOSED
                       title += "(#{l(:label_review_open)})" if o.status_changed_to == STATUS_OPEN
                       title
                  },
                  :description => Proc.new {|o| "#{o.comment}"},
                  :datetime => :created_at,
                  :author => :user,
                  :type => 'code_review',
                  :url => Proc.new {|o| {:controller => 'code_review', :action => 'show', :id => o.project, :review_id => o.id} }

  acts_as_activity_provider :type => 'code_review',
                              :timestamp => "#{CodeReview.table_name}.created_at",
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
  
  def committer
    begin
      return changeset.author if changeset.respond_to?('author')

      # For development mode. I don't know why "changeset.respond_to?('author')"
      # is false in development mode.
      if changeset.user_id
        return User.find(changeset.user_id)
      end
      changeset.committer.to_s.split('<').first
    rescue
    end
  end


  def lastchild
    return self if children.length == 0
    list = self.descendants.sort{|a, b|
      a.created_at <=> b.created_at
    }
    list.pop
  end

  def users
    return @users if @users
    @users = [user]
    children.each{|child|
      @users << child.user
    }
    @users
  end

  def users_for_notification
    return @users_for_notification if @users_for_notification
    @users_for_notification = []
    users.each {|user|
      setting = CodeReviewUserSetting.find_by_user_id(user.id)
      next unless setting
      next if setting.mail_notification == CodeReviewUserSetting::NOTIFCIATION_NONE
      @users_for_notification << user
    }
    @users_for_notification
  end

  def path
    begin
      return @path if @path
      repository = changeset.repository
      url = repository.url
      root_url = repository.root_url
      if (url == nil || root_url == nil)
        @path = change.path
        return @path
      end
      rootpath = url[root_url.length, url.length - root_url.length]
      if rootpath == '/' || rootpath.blank?
        @path = change.path
      else
        @path = change.path[rootpath.length, change.path.length - rootpath.length]
      end      
    rescue => ex
      return ex.to_s
    end
  end

  def revision
    begin
      changeset.revision
    rescue
    end
  end

  def change
    @change ||= Change.find(change_id)
  end

  def changeset
    @changeset ||= Changeset.find(change.changeset_id)
  end

  def repository
    @repository ||= changeset.repository
  end

end
