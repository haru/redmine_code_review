# Code Review plugin for Redmine
# Copyright (C) 2010  Haruyuki Iida
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

class CodeReviewSettingsController < ApplicationController
  unloadable
  layout 'base'
  menu_item :code_review

  before_filter :find_project, :authorize, :find_user

  def update   
    @setting = CodeReviewProjectSetting.find_or_create(@project)

    @setting.attributes = params[:setting]
    @setting.updated_by = @user_id
    @setting.auto_assign_settings = params[:auto_assign].to_yaml

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
