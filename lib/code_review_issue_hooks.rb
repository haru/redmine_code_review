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
  
  def view_issues_show_details_bottom(context = { })
    project = context[:project]
    return '' unless project
    unless User.current.allowed_to?({:controller => 'code_review', :action => 'show'}, project)
      return ''
    end
    controller = context[:controller]
    return '' unless controller
    
    request = context[:request]
    issue = context[:issue]
    return '' unless issue.code_review
    review = issue.code_review

    o = '<tr>'
    o << "<td><b>#{l(:code_review)}:</b></td>"
    o << '<td colspan="3">'
    o << link_to("#{review.path}:r#{review.revision}:line #{review.line}",
      :controller => 'code_review', :action => 'show', :id => project, :review_id => review.id)
    o << '</td>'
    o << '</tr>'
    return o
  end

end
