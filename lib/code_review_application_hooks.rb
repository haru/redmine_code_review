# frozen_string_literal: true

# Code Review plugin for Redmine
# Copyright (C) 2009-2010  Haruyuki Iida
#rev
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

class CodeReviewApplicationHooks < Redmine::Hook::ViewListener
  render_on :view_layouts_base_html_head, :partial => 'code_review/html_header'
  render_on :view_layouts_base_body_bottom, :partial => 'code_review/body_bottom'

  def view_layouts_base_body_bottom(context)
    if project = context[:project] and
      controller = context[:controller] and
        (controller.is_a?(RepositoriesController) or
         controller.is_a?(AttachmentsController)) and
      project.module_enabled?(:code_review) and
      User.current.allowed_to?(:view_code_review, project) and
      setting = CodeReviewProjectSetting.find_for(project) and
      setting.tracker.present?

      params = context[:request].parameters

      partial = case controller
      when AttachmentsController
        if params[:action] == "show"
          'code_review/change_attachement_view'
        end
      when RepositoriesController
        case params[:action]
        when 'show', 'revisions'
          'code_review/change_repository_view'
        when 'revision'
          'code_review/change_revision_view'
        when 'diff', 'entry', 'annotate'
          if params[:rev].blank? or params[:rev] == 'master'
            'code_review/change_entry_norevision_view'
          else
            'code_review/change_diff_view'
          end
        end
      end

      if partial
        controller.send :render_to_string, { partial: partial,
                                             locals: { project: project } }
      end
    end

  end
end
