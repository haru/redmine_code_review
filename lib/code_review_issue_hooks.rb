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

class CodeReviewIssueHooks < Redmine::Hook::ViewListener
  include RepositoriesHelper
  def view_issues_show_details_bottom(context = { })
    project = context[:project]
    return '' unless project
    unless User.current.allowed_to?({:controller => 'code_review', :action => 'show'}, project)
      return ''
    end
    controller = context[:controller]
    return '' unless controller
    if RAILS_ENV == 'development'
      load 'code_review_issue_patch.rb' unless Issue.respond_to?('code_review')
      load 'code_review_projects_helper_patch.rb' unless respond_to?('project_settings_tabs_with_code_review')
      load 'code_review_change_patch.rb' unless Change.respond_to?('code_review')
      load 'code_review_changeset_patch.rb' unless Change.respond_to?('review_count')
    end
    
    request = context[:request]
    issue = context[:issue]

    o = ''
    o << create_review_info(project, issue.code_review) if issue.code_review
    o << create_assignment_info(project, issue.code_review_assignment) if issue.code_review_assignment

    return o
  end

  def view_issues_form_details_bottom(context = { })
    project = context[:project]
    request = context[:request]
    parameters = request.parameters
    code = parameters[:code]
    return unless code
    issue = context[:issue]
    o = ''
    o << hidden_field_tag("code[rev]", code[:rev]) unless code[:rev].blank?
    o << "\n"
    o << hidden_field_tag("code[rev_to]", code[:rev_to]) unless code[:rev_to].blank?
    o << "\n"
    o << hidden_field_tag("code[path]", code[:path]) unless code[:path].blank?
    o << "\n"
    o << hidden_field_tag("code[action_type]", code[:action_type]) unless code[:action_type].blank?
    o << "\n"
    o << hidden_field_tag("code[change_id]", code[:change_id].to_i) unless code[:change_id].blank?
    o << "\n"
    o << hidden_field_tag("code[changeset_id]", code[:changeset_id].to_i) unless code[:changeset_id].blank?
    o << "\n"
    o << hidden_field_tag("code[attachment_id]", code[:attachment_id].to_i) unless code[:attachment_id].blank?


    return o
  end
  
  def controller_issues_new_after_save(context = { })
    project = context[:project]
    request = context[:request]
    parameters = request.parameters
    code = parameters[:code]
    return unless code
    issue = context[:issue]
    issue_id = issue.id

    assignment = CodeReviewAssignment.new
    assignment.issue_id = issue_id
    assignment.change_id = code[:change_id].to_i unless code[:change_id].blank?
    assignment.changeset_id = code[:changeset_id].to_i unless code[:changeset_id].blank?
    assignment.attachment_id = code[:attachment_id].to_i unless code[:attachment_id].blank?
    assignment.file_path = code[:path] unless code[:path].blank?
    assignment.rev = code[:rev] unless code[:rev].blank?
    assignment.rev_to = code[:rev_to] unless code[:rev_to].blank?
    assignment.action_type = code[:action_type] unless code[:action_type].blank?
    assignment.save!
  end

  private
  def create_review_info(project, review)
    o = '<tr>'
    o << "<td><b>#{l(:code_review)}:</b></td>"
    o << '<td colspan="3">'
    o << link_to("#{review.path}#{'@' + review.revision if review.revision}:line #{review.line}",
      :controller => 'code_review', :action => 'show', :id => project, :review_id => review.id)
    o << '</td>'
    o << '</tr>'
    return o
  end

  def create_assignment_info(project, assignment)
    o = '<tr>'
    o << "<td><b>#{l(:review_assigned_for)}:</b></td>"
    o << '<td colspan="3">'
    if assignment.path
      o << link_to("#{assignment.path}#{'@' + assignment.revision if assignment.revision}",
        :controller => 'code_review', :action => 'show', :id => project, :assignment_id => assignment.id)
    elsif assignment.revision
      o << l(:label_revision) + " " + link_to_revision(assignment.revision, project)
    elsif assignment.attachment
      attachment = assignment.attachment
      o << link_to(attachment.filename, :controller => 'attachments', :action => 'show', :id => attachment.id)
    end
    o << '</td>'
    o << '</tr>'
    return o
  end
end
