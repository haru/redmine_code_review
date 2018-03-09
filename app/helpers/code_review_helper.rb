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
    html = "#{l(:review_assignments)}:"
    assignments.each do |assignment|
      issue = assignment.issue
      html << link_to("##{issue.id} ", {:controller => 'issues', :action => 'show', :id => issue.id},
        :class => issue.css_classes, :title => "#{issue}(#{issue.status})")
    end if assignments

    link = link_to(l(:button_add), {:controller => 'code_review',
        :action => 'assign', :id=>project, :action_type => options[:action_type],
        :rev => options[:rev], :rev_to => options[:rev_to], :path => options[:path],
        :change_id => options[:change_id], :attachment_id => options[:attachment_id],
        :changeset_id => options[:changeset_id]}, :class => 'icon icon-add')

    html << link if link

    html
  end

  def progress_for_changeset(changeset)
    if changeset.review_count > 0
      progress = '<span style="white-space: nowrap">' + progress_bar([changeset.closed_review_pourcent, changeset.completed_review_pourcent],
        :width => '60px',
        :legend => "#{changeset.closed_review_count}/#{changeset.review_count} #{l(:label_closed_issues)}") + '</span>'
    elsif changeset.assignment_count > 0
      if (changeset.open_assignment_count > 0)
        progress = '<p class="progress-info" style="white-space: nowrap">' + l(:code_review_assigned) + '</p>'
      else
        progress = '<p class="progress-info" style="white-space: nowrap">' + l(:code_review_reviewed) + '</p>'
      end

    else
      progress = '<p class="progress-info" style="white-space: nowrap;"><span  style="white-space: nowrap;">' +
        l(:lable_no_code_reviews) +
        '</span>:<span  style="white-space: nowrap;">' +
        link_to(l(:label_assign_review), {:controller => 'code_review',
          :action => 'assign', :id=>@project,
          :rev => changeset.revision,
          :changeset_id => changeset.id}) +
          '</span></p>' if User.current.allowed_to?(:assign_code_review, @project)
    end
  end
end
