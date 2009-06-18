class CodeReviewSettingsController < ApplicationController
  unloadable
  layout 'base'
  menu_item :code_review

  before_filter :find_project, :authorize, :find_user

  def show
    if @user == User.anonymous
      render_403
      return
    end

    @setting = CodeReviewUserSetting.find_or_create(@user.id)
    
  end


  def update
    if @user == User.anonymous
      render_403
      return
    end

    @setting = CodeReviewUserSetting.find_by_user_id(@user.id)
    unless @setting
      @setting = CodeReviewUserSetting.new
      @setting.user_id = @user.id
    end

    @setting.attributes = params[:setting]

    @setting.save
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

  def am_i_member?
    @project.members.each{|m|
      return true if @user == m.user
    }
    return false
  end
end
