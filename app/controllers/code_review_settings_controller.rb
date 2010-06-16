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
  include CodeReviewAutoAssignSettings

  before_filter :find_project, :authorize, :find_user

  def update
    begin
      @setting = CodeReviewProjectSetting.find_or_create(@project)

      @setting.attributes = params[:setting]
      @setting.updated_by = @user.id
      params[:auto_assign][:filters] = params[:auto_assign][:filters].values unless params[:auto_assign][:filters].blank?
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
    rescue ActiveRecord::StaleObjectError
      # Optimistic locking exception
      flash[:error] = l(:notice_locking_conflict)
    end
    redirect_to :controller => 'projects', :action => "settings", :id => @project, :tab => 'code_review'

  end

  def add_filter
    setting = CodeReviewProjectSetting.find_or_create(@project)
    @auto_assign = setting.auto_assign_settings
    filters = params[:auto_assign][:filters].values unless params[:auto_assign][:filters].blank?
    filters = [] unless filters
    filters << params[:auto_assign_add_filter]

    @auto_assign.filters = filters.collect{|f|
      filter = AssignmentFilter.new
      filter.attributes = f
      filter
    }
    @auto_assign.filter_enabled = true
    render :partial => "code_review_settings/filters"
  end

  def edit_filter
    setting = CodeReviewProjectSetting.find_or_create(@project)
    @auto_assign = setting.auto_assign_settings
    num = params[:num].to_i
    filters = params[:auto_assign][:filters].values unless params[:auto_assign][:filters].blank?
    filters = [] unless filters
    i = 0
    @auto_assign.filters = filters.collect{|f|
      filter = AssignmentFilter.new
      if i == num
        filter.attributes = params[:auto_assign_edit_filter][num.to_s]
      else
        filter.attributes = f
      end
      i = i + 1
      filter
    }
    render :partial => "code_review_settings/filters"
  end

  def sort
    setting = CodeReviewProjectSetting.find_or_create(@project)
    @auto_assign = setting.auto_assign_settings
    filters = params[:auto_assign][:filters].values unless params[:auto_assign][:filters].blank?
    filters = [] unless filters
    num = params[:auto_assign_filter][:num].to_i
    move_to = params[:auto_assign_filter][:move_to]

    if move_to == 'highest'
      filters[num][:order] = 0
    elsif move_to == 'higher'
      filters[num][:order] = filters[num][:order].to_i - 15
    elsif move_to == 'lower'
      filters[num][:order] = filters[num][:order].to_i + 15
    elsif move_to == 'lowest'
      filters[num][:order] = 999999999
    end

    @auto_assign.filters = filters.collect{|f|
      filter = AssignmentFilter.new
      filter.attributes = f
      filter
    }
    

    render :partial => "code_review_settings/filters"
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
