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
  before_filter :find_project, :authorize, :find_user

  helper :sort
  include SortHelper

  def index
    sort_init 'id', 'desc'
    sort_update %w(id status path updated_at user_id changesets.committer changesets.revision)

    limit = per_page_option
    @review_count = CodeReview.count(:conditions => ['project_id = ? and parent_id is NULL', @project.id])
    @all_review_count = CodeReview.count(:conditions => ['project_id = ?', @project.id])
    @review_pages = Paginator.new self, @review_count, limit, params['page']
    @show_closed = (params['show_closed'] == 'true')
    show_closed_option = " and status not in (1)"
    if (@show_closed)
      show_closed_option = ''
    end
    @reviews = CodeReview.find :all, :order => sort_clause,
      :conditions => ['project_id = ? and parent_id is NULL' + show_closed_option, @project.id],
      :limit  =>  limit,
      :joins => 'left join changes on change_id = changes.id  left join changesets on changes.changeset_id = changesets.id',
      :offset =>  @review_pages.current.offset
    render :template => 'code_review/index.html.erb', :layout => !request.xhr?
  end

  def new
    @review = CodeReview.new(params[:review])
    @review.project_id = @project.id
    @review.user_id = @user.id
    @review.updated_by_id = @user.id
    @review.status = CodeReview::STATUS_OPEN
     
    if request.post?
      if (!@review.save)
        render :partial => 'new_form', :status => 250
        return
      end
      render :partial => 'add_success', :status => 220
      return
    else
      @review.change_id = params[:change_id].to_i unless params[:change_id].blank?
      @review.line = params[:line].to_i

    end
    render :partial => 'new_form', :status => 200
  end


  def update_diff_view
    @show_review_id = params[:review_id].to_i unless params[:review_id].blank?
    @review = CodeReview.new
    @rev = params[:rev] unless params[:rev].blank?
    @path = params[:path]
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
    @reviews = CodeReview.find(:all, :conditions => ['change_id = (?) and parent_id is NULL', @change.id])
    @review.change_id = @change.id
    render :partial => 'update_diff_view'
  end

  def show
    @review = CodeReview.find(params[:review_id].to_i)
    if request.xhr? or !params[:update].blank?
      render :partial => 'show'
    else
      @review = @review.root
      path = @review.path
      path = '/' + path unless path.match(/^\//)
      redirect_to url_for(:controller => 'repositories', :action => 'diff', :id => @project) + path + '?rev=' + @review.revision + '&review_id=' + @review.id.to_s

    end
  end

  def reply
    @parent = CodeReview.find(params[:parent_id].to_i)
    @review = @parent.root
    comment = params[:reply][:comment]
    @reply = CodeReview.new
    @reply.user_id = @user.id
    @reply.updated_by_id = @user.id
    @reply.project_id = @project.id
    @reply.change_id = @review.change_id
    @reply.comment = comment
    @reply.line = @review.line
    @parent.children << @reply
    if (!@parent.save)
      @review = CodeReview.find(@review.id)
    end
    render :partial => 'show'
  end

  def update
    begin
      @review = CodeReview.find(params[:review_id].to_i)
      @review.comment = params[:review][:comment]
      @review.lock_version = params[:review][:lock_version].to_i
      @review.updated_by_id = @user.id
      @review.save
      render :partial => 'show'
    rescue ActiveRecord::StaleObjectError
      # Optimistic locking exception
      @error = l(:notice_locking_conflict)
      render :partial => 'show'
    end
  end


  def destroy
    @review = CodeReview.find(params[:review_id].to_i)
    @review.destroy if @review
    render :text => 'delete success.'
  end

  def close
    @review = CodeReview.find(params[:review_id].to_i)
    
    closed_message = CodeReview.new
    closed_message.user_id = @user.id
    closed_message.updated_by_id = @user.id
    closed_message.project_id = @project.id
    closed_message.line = @review.line
    closed_message.change_id = @review.change_id
    closed_message.comment = 'closed.'
    closed_message.status_changed_from = @review.status
    closed_message.status_changed_to = CodeReview::STATUS_CLOSED
    
    @review.children << closed_message
  
    @review.close
    @review.updated_by_id = @user.id
    @review.save!
    @notice = l(:notice_review_updated)
    render :partial => 'show'
    #redirect_to :action => "show", :id => @project, :review_id => @review.id, :update => true
  end

  def reopen
    @review = CodeReview.find(params[:review_id].to_i)

    reopen_message = CodeReview.new
    reopen_message.user_id = @user.id
    reopen_message.updated_by_id = @user.id
    reopen_message.project_id = @project.id
    reopen_message.line = @review.line
    reopen_message.change_id = @review.change_id
    reopen_message.comment = 'reopen.'
    reopen_message.status_changed_from = @review.status
    reopen_message.status_changed_to = CodeReview::STATUS_OPEN

    @review.children << reopen_message
    @review.reopen
    @review.updated_by_id = @user.id
    @review.save
    @notice = l(:notice_review_updated)
    render :partial => 'show'
    #redirect_to :action => "show", :id => @project, :review_id => @review.id, :update => true
  end


  private
  def find_project
    # @project variable must be set before calling the authorize filter
    @project = Project.find(params[:id])
  end

  def find_user
    @user = User.current
  end

 
end
