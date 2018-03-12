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
module CodeReviewHelper
  unloadable
  def show_assignments(assignments, project, options = {})

    links = if assignments
      assignments.map do |assignment|
        issue = assignment.issue
        link_to("##{issue.id} ", {:controller => 'issues', :action => 'show', :id => issue.id},
          :class => issue.css_classes, :title => "#{issue}(#{issue.status})")
      end
    else
      []
    end

    links << link_to(
      l(:button_add),
      options.merge(controller: 'code_review', action: 'assign', id: project),
      class: 'icon icon-add'
    )

    safe_join links
  end

  def progress_for_changeset(changeset)
    progress = if changeset.review_count > 0
      content_tag(:span, style: "white-space: nowrap") do
        progress_bar(
          [changeset.closed_review_pourcent, changeset.completed_review_pourcent],
          :width => '60px',
          :legend => "#{changeset.closed_review_count}/#{changeset.review_count} #{l(:label_closed_issues)}"
        )
      end

    elsif changeset.assignment_count > 0
      if (changeset.open_assignment_count > 0)
        l(:code_review_assigned)
      else
        l(:code_review_reviewed)
      end

    elsif User.current.allowed_to?(:assign_code_review, @project)
      content_tag(:span, style: "white-space: nowrap") do
        l(:lable_no_code_reviews)
      end + ':'.html_safe +
      content_tag(:span, style: "white-space: nowrap") do
        link_to(l(:label_assign_review), {:controller => 'code_review',
          :action => 'assign', :id=>@project,
          :rev => changeset.revision,
          :changeset_id => changeset.id})
      end
    end

    content_tag(:p, class: "progress-info", style: "white-space: nowrap;") do
      progress
    end if progress
  end
end
