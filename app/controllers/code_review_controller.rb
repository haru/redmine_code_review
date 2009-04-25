class CodeReviewController < ApplicationController

  before_filter :find_project, :authorize, :find_user

  def index
    @reviews = CodeReview.find(:all, :conditions => ['project_id = ? and parent_id is NULL', @project.id])
  end

  def new
    @review = CodeReview.new(params[:review])
    @review.project_id = @project.id
    @review.user_id = @user.id 
     
    if request.post?
      if (!@review.save)
        render :partial => 'new_form', :status => 250
        return
      end
      render :partial => 'new_form', :status => 220
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
    changeset = Changeset.find_by_revision(@rev)
    @change = nil
    changeset.changes.each{|change| @change = change if change.path == @path}
    @reviews = CodeReview.find(:all, :conditions => ['change_id = (?) and parent_id is NULL', @change.id])
    @review.change_id = @change.id
    render :partial => 'update_diff_view'
  end

  def show
    @review = CodeReview.find(params[:review_id].to_i)
    render :partial => 'show'
  end

  def update
  end


  def destroy
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
