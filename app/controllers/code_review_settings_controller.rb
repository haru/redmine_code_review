class CodeReviewSettingsController < ApplicationController
  unloadable
  layout 'base'
  menu_item :code_review

  before_filter :find_project, :authorize, :find_user

  def show
    @setting = CodeReviewProjectSetting.find(:first, :conditions => ['project_id = ?', @project.id])
    @setting = CodeReviewProjectSetting.new unless @setting
  end


  def update   
    @setting = CodeReviewProjectSetting.find(:first, :conditions => ['project_id = ?', @project.id])
    unless @setting
      @setting = CodeReviewProjectSetting.new
      @setting.project_id = @project.id
    end

    @setting.attributes = params[:setting]
    @setting.updated_by = @user_id

    @setting.save!
    flash[:notice] = l(:notice_successful_update)
    redirect_to :action => "show", :id => @project
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
