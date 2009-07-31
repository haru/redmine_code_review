class CodeReviewSettingsController < ApplicationController
  unloadable
  layout 'base'
  menu_item :code_review

  before_filter :find_project, :authorize, :find_user

  def update   
    @setting = CodeReviewProjectSetting.find(:first, :conditions => ['project_id = ?', @project.id])
    unless @setting
      @setting = CodeReviewProjectSetting.new
      @setting.project_id = @project.id
    end

    @setting.attributes = params[:setting]
    @setting.updated_by = @user_id

    @setting.save!
    convert = params[:convert] unless params[:convert].blank?
    if (convert and convert == 'true')
      old_reviews = find_old_reviews
      old_reviews.each {|review|
        review.convert_to_new_data
        review.destroy
      }
    end
    flash[:notice] = l(:notice_successful_update)
    redirect_to :controller => 'projects', :action => "settings", :id => @project, :tab => 'code_review'
  end

  private
  def find_project
    # @project variable must be set before calling the authorize filter
    @project = Project.find(params[:id])
  end

  def find_user
    @user = User.current
  end

  def find_old_reviews
    CodeReview.find(:all,
      :conditions => ['issue_id is ? and old_parent_id is ? and project_id = ?', nil, nil, @project.id])
  end
end
