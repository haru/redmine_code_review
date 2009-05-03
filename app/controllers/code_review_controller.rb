class CodeReviewController < ApplicationController

  before_filter :find_project, :authorize, :find_user

  helper :sort
  include SortHelper

  def index
    sort_init 'id', 'desc'
    #sort_update({'id' => "#{CodeReview.table_name}.id"}.merge(@query.columns.inject({}) {|h, c| h[c.name.to_s] = c.sortable; h}))

    limit = per_page_option
    @review_count = CodeReview.count(:conditions => ['project_id = ? and parent_id is NULL', @project.id])
    @review_pages = Paginator.new self, @review_count, limit, params['page']
    @reviews = CodeReview.find :all, :order => sort_clause,
      :conditions => ['project_id = ? and parent_id is NULL', @project.id],
      :limit  =>  limit,
      :offset =>  @review_pages.current.offset
    render :template => 'code_review/index.html.erb', :layout => !request.xhr?
  end

  def new
    @review = CodeReview.new(params[:review])
    @review.project_id = @project.id
    @review.user_id = @user.id
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
    @review = CodeReview.new
    @rev = params[:rev].to_i unless params[:rev].blank?
    @path = params[:path]
    changeset = Changeset.find_by_revision(@rev, :conditions => ['repository_id = (?)',@project.repository.id])
    @change = nil
    changeset.changes.each{|change|
      @change = change if change.path == @path
    }
    @reviews = CodeReview.find(:all, :conditions => ['change_id = (?) and parent_id is NULL', @change.id])
    @review.change_id = @change.id
    render :partial => 'update_diff_view'
  end

  def show
    @review = CodeReview.find(params[:review_id].to_i)
    render :partial => 'show'
  end

  def reply
    @parent = CodeReview.find(params[:parent_id].to_i)
    @review = @parent.root
    comment = params[:reply][:comment]
    reply = CodeReview.new
    reply.user_id = @user.id
    reply.project_id = @project.id
    reply.change_id = @review.change_id
    reply.comment = comment
    reply.line = @review.line
    @parent.children << reply
    @parent.save!
    render :partial => 'show'
  end

  def update
  end


  def destroy
    @review = CodeReview.find(params[:review_id].to_i)
    @review.destroy if @review
    render :partial => 'destroy'
  end

  def close
    @review = CodeReview.find(params[:review_id].to_i)
    @review.close
    @review.save
    render :partial => 'show'
  end

  def reopen
    @review = CodeReview.find(params[:review_id].to_i)
    @review.reopen
    @review.save
    render :partial => 'show'
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
