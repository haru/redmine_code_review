# Code Review plugin for Redmine
# Copyright (C) 2009-2011  Haruyuki Iida
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
  render_on :view_issues_show_details_bottom, partial: "code_review/issues_show_details_bottom"

  def view_issues_show_details_bottom_org(context = {})
    project = context[:project]
    return "" unless project
    unless User.current.allowed_to?({ controller: "code_review", action: "show" }, project)
      return ""
    end
    controller = context[:controller]
    return "" unless controller
    issue = context[:issue]

    o = ""
    o << create_review_info(project, issue.code_review) if issue.code_review
    o << create_assignment_info(project, issue.code_review_assignment) if issue.code_review_assignment

    o
  end

  def view_issues_form_details_bottom(context = {}) # rubocop:disable Metrics/AbcSize -- legacy method, refactor separately
    request = context[:request]
    parameters = request.parameters
    code = parameters[:code]
    return unless code
    o = ""
    o << hidden_field_tag("code[rev]", code[:rev]) if code[:rev].present?
    o << "\n"
    o << hidden_field_tag("code[rev_to]", code[:rev_to]) if code[:rev_to].present?
    o << "\n"
    o << hidden_field_tag("code[path]", code[:path]) if code[:path].present?
    o << "\n"
    o << hidden_field_tag("code[action_type]", code[:action_type]) if code[:action_type].present?
    o << "\n"
    o << hidden_field_tag("code[change_id]", code[:change_id].to_i) if code[:change_id].present?
    o << "\n"
    o << hidden_field_tag("code[changeset_id]", code[:changeset_id].to_i) if code[:changeset_id].present?
    o << "\n"
    o << hidden_field_tag("code[attachment_id]", code[:attachment_id].to_i) if code[:attachment_id].present?

    o
  end

  def controller_issues_new_after_save(context = {}) # rubocop:disable Metrics/AbcSize -- legacy method, refactor separately
    if context[:request] && context[:project] && context[:issue]
      request = context[:request]
      parameters = request.parameters
      code = parameters[:code]
      return unless code
      issue = context[:issue]
      issue_id = issue.id

      assignment = CodeReviewAssignment.new
      assignment.issue_id = issue_id
      assignment.change_id = code[:change_id].to_i if code[:change_id].present?
      assignment.changeset_id = code[:changeset_id].to_i if code[:changeset_id].present?
      assignment.attachment_id = code[:attachment_id].to_i if code[:attachment_id].present?
      assignment.file_path = code[:path] if code[:path].present?
      assignment.rev = code[:rev] if code[:rev].present?
      assignment.rev_to = code[:rev_to] if code[:rev_to].present?
      assignment.action_type = code[:action_type] if code[:action_type].present?
      assignment.save!
    end
  end

  private

  def create_review_info(project, review)
    o = "<tr>"
    o << "<td><b>#{l(:code_review)}:</b></td>"
    o << '<td colspan="3">'
    o << link_to("#{review.repository_identifier + ':' if review.repository_identifier}#{review.path}#{'@' + review.revision if review.revision}:line #{review.line}",
                 controller: "code_review", action: "show", id: project, review_id: review.id, repository_id: review.repository_identifier)
    o << "</td>"
    o << "</tr>"
    o
  end

  def create_assignment_info(project, assignment)
    repository_id = assignment.repository_identifier
    o = "<tr>"
    o << "<td><b>#{l(:review_assigned_for)}:</b></td>"
    o << '<td colspan="3">'
    if assignment.path
      o << link_to("#{repository_id + ':' if repository_id}#{assignment.path}#{'@' + assignment.revision if assignment.revision}",
                   controller: "code_review", action: "show", id: project, assignment_id: assignment.id, repository_id: repository_id)
    elsif assignment.revision
      repo = project unless repository_id
      repo ||= assignment.repository
      o << (l(:label_revision) + " " + link_to_revision(assignment.revision, repo))
    elsif assignment.attachment
      attachment = assignment.attachment
      o << link_to(attachment.filename, controller: "attachments", action: "show", id: attachment.id)
    end
    o << "</td>"
    o << "</tr>"
    o
  end
end
