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

require 'changeset'
require 'change'

class CodeReviewController < ApplicationController
  unloadable
  before_filter :find_project, :authorize, :find_user, :find_setting

  helper :sort
  include SortHelper
  helper :journals
  helper :projects
  include ProjectsHelper
  helper :issues
  include IssuesHelper

  def index
    unless @setting
      redirect_to :controller => 'code_review_settings', :action => "show" , :id => @project
      return
    end
    sort_init "#{Issue.table_name}.id", 'desc'
    sort_update ["#{Issue.table_name}.id", "#{Issue.table_name}.status_id", "path", "updated_at", "user_id", "#{Changeset.table_name}.committer", "#{Changeset.table_name}.revision"]

    limit = per_page_option
    @review_count = CodeReview.count(:conditions => ['project_id = ? and issue_id is NOT NULL', @project.id])
    @all_review_count = CodeReview.count(:conditions => ['project_id = ?', @project.id])
    @review_pages = Paginator.new self, @review_count, limit, params['page']
    @show_closed = (params['show_closed'] == 'true')
    show_closed_option = " and #{IssueStatus.table_name}.is_closed = ? "
    if (@show_closed)
      show_closed_option = ''
    end
    conditions = ["#{CodeReview.table_name}.project_id = ? and issue_id is NOT NULL" + show_closed_option, @project.id]
    unless (@show_closed)
      conditions << false
    end

    @reviews = CodeReview.find :all, :order => sort_clause,
      :conditions => conditions,
      :limit  =>  limit,
      :joins => "left join #{Change.table_name} on change_id = #{Change.table_name}.id  left join #{Changeset.table_name} on #{Change.table_name}.changeset_id = #{Changeset.table_name}.id " + 
      "left join #{Issue.table_name} on issue_id = #{Issue.table_name}.id " +
      "left join #{IssueStatus.table_name} on #{Issue.table_name}.status_id = #{IssueStatus.table_name}.id",
      :offset =>  @review_pages.current.offset
    @i_am_member = am_i_member?
    render :template => 'code_review/index.html.erb', :layout => !request.xhr?
  end

  def new
    begin
      CodeReview.transaction {
        unless @setting
          redirect_to :controller => 'code_review_settings', :action => "show" , :id => @project
          return
        end
        @review = CodeReview.new
        @review.issue = Issue.new
        @review.issue.tracker_id = @setting.tracker_id
        @review.attributes = params[:review]
        @review.project_id = @project.id
        @review.issue.project_id = @project.id

        @review.user_id = @user.id
        @review.updated_by_id = @user.id
        @review.issue.start_date = Date.today
        @review.action_type = params[:action_type]
        @review.rev = params[:rev] unless params[:rev].blank?
        @review.rev_to = params[:rev_to] unless params[:rev_to].blank?
        @review.file_path = params[:path] unless params[:path].blank?
        @issue = @review.issue

        if request.post?
          if (@review.changeset and @review.changeset.user_id)
            @review.issue.assigned_to_id = @review.changeset.user_id
          end

          @review.issue.save!
          @review.save!          
           
          if (l(:THIS_IS_REDMINE_O_8_STABELE) == 'THIS_IS_REDMINE_O_8_STABELE')
            Mailer.deliver_issue_add(@review.issue) if Setting.notified_events.include?('issue_added')
          end

          render :partial => 'add_success', :status => 220
          return
        else
          @review.change_id = params[:change_id].to_i unless params[:change_id].blank?
          @review.line = params[:line].to_i

        end
        render :partial => 'new_form', :status => 200
      }
    
    end
  end


  def update_diff_view
    @show_review_id = params[:review_id].to_i unless params[:review_id].blank?
    @show_review = CodeReview.find(@show_review_id) if @show_review_id
    @review = CodeReview.new
    @rev = params[:rev] unless params[:rev].blank?
    @rev_to = params[:rev_to] unless params[:rev_to].blank?
    @path = params[:path]
    @action_type = params[:action_type]
    changeset = Changeset.find_by_revision(@rev, :conditions => ['repository_id = (?)',@project.repository.id])
    repository = @project.repository
    url = repository.url
    root_url = repository.root_url
    if (url == nil || root_url == nil)
        fullpath = @path
    else
        rootpath = url[root_url.length, url.length - root_url.length]
        if rootpath.blank?
            fullpath = @path
        else
            fullpath = (rootpath + '/' + @path).gsub(/[\/]+/, '/')
        end
    end
    @change = nil
    changeset.changes.each{|chg|
      @change = chg if ((chg.path == fullpath) or ('/' + chg.path == fullpath))
    }
    unless @change
      @changeset = changeset
      render :partial => 'show_error'
      return
    end

    @reviews = CodeReview.find(:all, :conditions => ['change_id = (?) and issue_id is NOT NULL', @change.id])
   
    @review.change_id = @change.id
    render :partial => 'update_diff_view'
  end

  def show
    @review = CodeReview.find(params[:review_id].to_i)
    @issue = @review.issue
    @allowed_statuses = @review.issue.new_statuses_allowed_to(User.current)
    if request.xhr? or !params[:update].blank?
      render :partial => 'show'
    else
      #@review = @review.root
      path = @review.path
      path = '/' + path unless path.match(/^\//)
      action_name = @review.action_type
      rev_to = ''
      rev_to = '&rev_to=' + @review.rev_to if @review.rev_to
      redirect_to url_for(:controller => 'repositories', :action => action_name, :id => @project) + path + '?rev=' + @review.revision + '&review_id=' + @review.id.to_s + rev_to

    end
  end

  def reply
    begin
      @review = CodeReview.find(params[:review_id].to_i)
      @issue = @review.issue
      @issue.lock_version = params[:issue][:lock_version]
      comment = params[:reply][:comment]
      journal = @issue.init_journal(User.current, comment)
      @review.attributes = params[:review]
      @allowed_statuses = @issue.new_statuses_allowed_to(User.current)

      @issue.save!
      if !journal.new_record?
        # Only send notification if something was actually changed
        flash[:notice] = l(:notice_successful_update)
        if (l(:THIS_IS_REDMINE_O_8_STABELE) == 'THIS_IS_REDMINE_O_8_STABELE')
          lang = current_language
          Mailer.deliver_issue_edit(journal) if Setting.notified_events.include?('issue_updated')
          set_language lang if respond_to? 'set_language'
        end
      end
      
      render :partial => 'show'
    rescue ActiveRecord::StaleObjectError
      # Optimistic locking exception
      @error = l(:notice_locking_conflict)
      render :partial => 'show'
    end
  end

  def update
    begin
      CodeReview.transaction {
        @review = CodeReview.find(params[:review_id].to_i)
        journal = @review.issue.init_journal(User.current, nil)
        @allowed_statuses = @review.issue.new_statuses_allowed_to(User.current)
        @issue = @review.issue
        @issue.lock_version = params[:issue][:lock_version]
        @review.attributes = params[:review]
        @review.updated_by_id = @user.id
        @review.save!
        @review.issue.save!
        @notice = l(:notice_review_updated)
        lang = current_language
        Mailer.deliver_issue_edit(journal) if Setting.notified_events.include?('issue_updated')
        set_language lang if respond_to? 'set_language'
        render :partial => 'show'
      }
    rescue ActiveRecord::StaleObjectError
      # Optimistic locking exception
      @error = l(:notice_locking_conflict)
      render :partial => 'show'
    rescue
      render :partial => 'show'
    end
  end


  def destroy
    @review = CodeReview.find(params[:review_id].to_i)
    @review.issue.destroy if @review
    render :text => 'delete success.'
  end

  private
  def find_project
    # @project variable must be set before calling the authorize filter
    @project = Project.find(params[:id])
  end

  def find_user
    @user = User.current
  end


  def find_setting
    @setting = CodeReviewProjectSetting.find(:first, :conditions => ['project_id = ?', @project.id])
  end


  def am_i_member?
    @project.members.each{|m|
      return true if @user == m.user
    }
    return false
  end
end
