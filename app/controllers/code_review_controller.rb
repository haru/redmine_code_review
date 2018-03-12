# Code Review plugin for Redmine
# Copyright (C) 2009-2015 Haruyuki Iida
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

class CodeReviewController < ApplicationController
  before_filter :find_project, :authorize, :find_user, :find_setting, :find_repository

  helper :sort
  include SortHelper
  helper :journals
  helper :projects
  include ProjectsHelper
  helper :issues
  include IssuesHelper
  helper :code_review
  include CodeReviewHelper
  helper :custom_fields
  include CustomFieldsHelper

  def index
    sort_init "#{Issue.table_name}.id", 'desc'
    sort_update ["#{Issue.table_name}.id", "#{Issue.table_name}.status_id", "#{Issue.table_name}.subject",  "path", "updated_at", "user_id", "#{Changeset.table_name}.committer", "#{Changeset.table_name}.revision"]

    limit = per_page_option
    @review_count = CodeReview.where(["project_id = ? and issue_id is NOT NULL", @project.id]).count
    @all_review_count = CodeReview.where(['project_id = ?', @project.id]).count
    @review_pages = Paginator.new @review_count, limit, params['page']
    @show_closed = (params['show_closed'] == 'true')
    show_closed_option = " and #{IssueStatus.table_name}.is_closed = ? "
    if (@show_closed)
      show_closed_option = ''
    end
    conditions = ["#{CodeReview.table_name}.project_id = ? and issue_id is NOT NULL" + show_closed_option, @project.id]
    unless (@show_closed)
      conditions << false
    end

    @reviews = CodeReview.order(sort_clause).limit(limit).where(conditions).joins(
      "left join #{Change.table_name} on change_id = #{Change.table_name}.id  left join #{Changeset.table_name} on #{Change.table_name}.changeset_id = #{Changeset.table_name}.id " +
      "left join #{Issue.table_name} on issue_id = #{Issue.table_name}.id " +
      "left join #{IssueStatus.table_name} on #{Issue.table_name}.status_id = #{IssueStatus.table_name}.id").offset(@review_pages.offset)
    @i_am_member = @user.member_of?(@project)
    render :template => 'code_review/index', :layout => !request.xhr?
  end

  def new
    begin
      CodeReview.transaction {
        @review = CodeReview.new
        @review.issue = Issue.new

        if params[:issue] and params[:issue][:tracker_id]
          @review.issue.tracker_id = params[:issue][:tracker_id].to_i
        else
          @review.issue.tracker_id = @setting.tracker_id
        end
        @review.assign_attributes(params[:review])
        @review.project_id = @project.id
        @review.issue.project_id = @project.id

        @review.user_id = @user.id
        @review.updated_by_id = @user.id
        @review.issue.start_date ||= Date.today if Setting.default_issue_start_date_to_creation_date?
        @review.action_type = params[:action_type]
        @review.rev = params[:rev] unless params[:rev].blank?
        @review.rev_to = params[:rev_to] unless params[:rev_to].blank?
        @review.file_path = params[:path] unless params[:path].blank?
        @review.file_count = params[:file_count].to_i unless params[:file_count].blank?
        @review.attachment_id = params[:attachment_id].to_i unless params[:attachment_id].blank?
        @issue = @review.issue
        @review.issue.safe_attributes = params[:issue] unless params[:issue].blank?
        @review.diff_all = (params[:diff_all] == 'true')

        @parent_candidate = get_parent_candidate(@review.rev) if  @review.rev

        if request.post?
          @review.issue.save!
          if @review.changeset
            @review.changeset.issues.each {|issue|
              create_relation @review, issue, @setting.issue_relation_type
            } if @setting.auto_relation?
          elsif @review.attachment and @review.attachment.container_type == 'Issue'
            issue = Issue.find_by_id(@review.attachment.container_id)
            create_relation @review, issue, @setting.issue_relation_type if @setting.auto_relation?
          end
          watched_users = []
          @review.open_assignment_issues(@user.id).each {|issue|
            unless @review.issue.parent_id == issue.id
              create_relation @review, issue, IssueRelation::TYPE_RELATES
            end
            unless watched_users.include?(issue.author)
              watcher = Watcher.new
              watcher.watchable_id = @review.issue.id
              watcher.watchable_type = 'Issue'
              watcher.user = issue.author
              watcher.save!
              watched_users.push(watcher.user)
            end
          }
          @review.save!

          render :partial => 'add_success', :status => 200
          return
        else
          change_id = params[:change_id].to_i unless params[:change_id].blank?
          @review.change = Change.find(change_id) if change_id
          @review.line = params[:line].to_i unless params[:line].blank?
          if (@review.changeset and @review.changeset.user_id)
            @review.issue.assigned_to_id = @review.changeset.user_id
          end
          @default_version_id = @review.issue.fixed_version.id if @review.issue.fixed_version
          if @review.changeset and @default_version_id.blank?
            @review.changeset.issues.each {|issue|
              if issue.fixed_version
                @default_version_id = issue.fixed_version.id
                break;
              end
            }
          end
          @review.open_assignment_issues(@user.id).each {|issue|
            if issue.fixed_version
              @default_version_id = issue.fixed_version.id
              break;
            end
          } unless @default_version_id


        end
        render :partial => 'new_form', :status => 200
      }
    rescue ActiveRecord::RecordInvalid => e
      logger.error e
      render :partial => 'new_form', :status => 200
    end
  end

  def assign
    code = {}
    code[:action_type] = params[:action_type] unless params[:action_type].blank?
    code[:rev] = params[:rev] unless params[:rev].blank?
    code[:rev_to] = params[:rev_to] unless params[:rev_to].blank?
    code[:path] = params[:path] unless params[:path].blank?
    code[:change_id] = params[:change_id].to_i unless params[:change_id].blank?
    code[:changeset_id] = params[:changeset_id].to_i unless params[:changeset_id].blank?
    code[:attachment_id] = params[:attachment_id].to_i unless params[:attachment_id].blank?
    code[:repository_id] = @repository_id if @repository_id

    changeset = Changeset.find(code[:changeset_id]) if code[:changeset_id]
    if (changeset == nil and code[:change_id] != nil)
      change = Change.find(code[:change_id])
      changeset = change.changeset if change
    end
    attachment = Attachment.find(code[:attachment_id]) if code[:attachment_id]

    issue = {}
    issue[:subject] = l(:code_review_requrest)
    issue[:subject] << " [#{changeset.text_tag}: #{changeset.short_comments}]" if changeset
    unless changeset
      issue[:subject] << " [#{attachment.filename}]" if attachment
    end
    issue[:tracker_id] = @setting.assignment_tracker_id if @setting.assignment_tracker_id

    redirect_to :controller => 'issues', :action => "new" , :project_id => @project,
      :issue => issue, :code => code
  end

  def update_diff_view
    @show_review_id = params[:review_id].to_i unless params[:review_id].blank?
    @show_review = CodeReview.find(@show_review_id) if @show_review_id
    @review = CodeReview.new
    @rev = params[:rev] unless params[:rev].blank?
    @rev_to = params[:rev_to] unless params[:rev_to].blank?
    @path = params[:path] unless params[:path].blank?
    @paths = []
    @paths << @path unless @path.blank?

    @action_type = params[:action_type]
    changeset = @repository.find_changeset_by_name(@rev)
    if @paths.empty?
      changeset.filechanges.each{|chg|
      }
    end

    url = @repository.url
    root_url = @repository.root_url
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
    changeset.filechanges.each{|chg|
      @change = chg if ((chg.path == fullpath) or ("/#{chg.path}" == fullpath)) or (chg.path == "/#{@path}")
    }  unless @path.blank?

    @changeset = changeset
    if @path
      @reviews = CodeReview.where(['file_path = ? and rev = ? and issue_id is NOT NULL', @path, @rev]).where(:project_id => @project.id).all
    else
      @reviews = CodeReview.where(['rev = ? and issue_id is NOT NULL', @rev]).where(:project_id => @project.id).all
    end
    @review.change_id = @change.id if @change

    #render :partial => 'show_error'
    #return



    render :partial => 'update_diff_view'
  end

  def update_attachment_view
    @show_review_id = params[:review_id].to_i unless params[:review_id].blank?
    @attachment_id = params[:attachment_id].to_i
    @show_review = CodeReview.find(@show_review_id) if @show_review_id
    @review = CodeReview.new
    @action_type = 'attachment'
    @attachment = Attachment.find(@attachment_id)

    @reviews = CodeReview.where(['attachment_id = (?) and issue_id is NOT NULL', @attachment_id]).all

    render :partial => 'update_diff_view'
  end

  def show
    @review = CodeReview.find(params[:review_id].to_i) unless params[:review_id].blank?
    @repository = @review.repository if @review
    @assignment = CodeReviewAssignment.find(params[:assignment_id].to_i) unless params[:assignment_id].blank?
    @repository_id = @assignment.repository_identifier if @assignment
    @issue = @review.issue if @review
    @allowed_statuses = @review.issue.new_statuses_allowed_to(User.current) if @review
    target = @review if @review
    target = @assignment if @assignment
    @repository_id = target.repository_identifier
    if request.xhr? or !params[:update].blank?
      render :partial => 'show'
    elsif target.path
      #@review = @review.root
      path = URI.decode(target.path)
      #path = '/' + path unless path.match(/^\//)
      action_name = target.action_type
      rev_to = ''
      rev_to = '&rev_to=' + target.rev_to if target.rev_to
      if action_name == 'attachment'
        attachment = target.attachment
        url = url_for(:controller => 'attachments', :action => 'show', :id => attachment.id) + '/' + URI.escape(attachment.filename)
        url << '?review_id=' + @review.id.to_s if @review
        redirect_to(url)
      else
        path = nil if target.diff_all
        url = url_for(:controller => 'repositories', :action => action_name, :id => @project,
          :repository_id => @repository_id, :rev => target.revision, :path => path)
        #url = url_for(:controller => 'repositories', :action => action_name, :id => @project, :repository_id => @repository_id) + path + '?rev=' + target.revision
        url << '?review_id=' + @review.id.to_s + rev_to if @review
        url << '?r=' + rev_to unless @review
        redirect_to url
      end
    end
  end

  def reply
    begin
      @review = CodeReview.find(params[:review_id].to_i)
      @issue = @review.issue
      @issue.lock_version = params[:issue][:lock_version]
      comment = params[:reply][:comment]
      journal = @issue.init_journal(User.current, comment)
      @review.assign_attributes(params[:review])
      @allowed_statuses = @issue.new_statuses_allowed_to(User.current)

      @issue.save!
      if !journal.new_record?
        # Only send notification if something was actually changed
        flash[:notice] = l(:notice_successful_update)
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
        @review.assign_attributes(params[:review])
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

  def forward_to_revision
    path = params[:path]
    rev = params[:rev]
    changesets = @repository.latest_changesets(path, rev, Setting.repository_log_display_limit.to_i)
    change = changesets[0]

    identifier = change.identifier
    redirect_to url_for(:controller => 'repositories', :action => 'entry', :id => @project, :repository_id => @repository_id) + '/' + path + '?rev=' + identifier.to_s

  end

  def preview
    @text = params[:review][:comment]
    @text ||= params[:reply][:comment]
    render partial: 'common/preview'
  end

  def update_revisions_view
    changeset_ids = params[:changeset_ids].to_s.split(',')
    @changesets = changeset_ids.map do |id|
      @repository.find_changeset_by_name(id) unless id.blank?
    end
    render partial: 'update_revisions'
  end

  private
  def find_repository
    if params[:repository_id].present?
      @repository = @project.repositories.find_by_identifier_param(params[:repository_id])
    else
      @repository = @project.repository
    end
    @repository_id = @repository.identifier_param
  end

  def find_project
    # @project variable must be set before calling the authorize filter
    @project = Project.find(params[:id])
  end

  def find_user
    @user = User.current
  end


  def find_setting
    @setting = CodeReviewProjectSetting.find_or_create(@project)
  end

  def get_parent_candidate(revision)
    changeset = @repository.find_changeset_by_name(revision)
    changeset.issues.each {|issue|
      return Issue.find(issue.parent_issue_id) if issue.parent_issue_id
    }
    nil
  end

  def create_relation(review, issue, type)
    return unless issue.project == @project
    relation = IssueRelation.new
    relation.relation_type = type
    relation.issue_from_id = review.issue.id
    relation.issue_to_id = issue.id
    relation.save!
  end
end
