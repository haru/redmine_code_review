# Code Review plugin for Redmine
# Copyright (C) 2009  Haruyuki Iida
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

  def view_layouts_base_html_head(context = {})
    project = context[:project]
    return '' unless project
    controller = context[:controller]
    return '' unless controller
    action_name = controller.action_name
    return '' unless action_name
    baseurl = url_for(:controller => 'code_review', :action => 'index', :id => project) + '/../../..'

    unless User.current.allowed_to?({:controller => 'code_review', :action => 'update_diff_view'}, project)
      return ''
    end
    
    return '' unless (controller.class.name == 'RepositoriesController' and (action_name == 'diff' or action_name == 'show' or action_name == 'entry' or action_name == 'annotate' or action_name == 'revisions' or action_name == 'revision'))

    o = ""
    o << javascript_include_tag(baseurl + "/plugin_assets/redmine_code_review/javascripts/code_review.js")
    o << javascript_include_tag(baseurl + '/javascripts/jstoolbar/jstoolbar.js')
    o << javascript_include_tag(baseurl + '/javascripts/jstoolbar/textile.js')
    o << javascript_include_tag(baseurl + "/javascripts/jstoolbar/lang/jstoolbar-#{project.current_language}.js") 

    o << stylesheet_link_tag(baseurl + "/plugin_assets/redmine_code_review/stylesheets/code_review.css") 

    return o
  end
  
  def view_layouts_base_body_bottom(context = { })
    project = context[:project]
    return '' unless project
    unless User.current.allowed_to?({:controller => 'code_review', :action => 'update_diff_view'}, project)
      return ''
    end
    return unless code_review_setting_exists?(project)
    controller = context[:controller]
    return '' unless controller
    action_name = controller.action_name
    return '' unless action_name
    return '' unless (controller.class.name == 'RepositoriesController')
    return change_repository_view context if (action_name == 'show' or action_name == 'revisions')
    return change_revision_view context if (action_name == 'revision')
    return '' unless (action_name == 'diff' or action_name == 'entry' or action_name == 'annotate')
    return '' if controller.params[:rev].blank?
    request = context[:request]
    parameters = request.parameters
    rev_to = parameters['rev_to'] unless parameters['rev_to'].blank?
    review_id = parameters['review_id']
    rev = parameters['rev']
    patharray = parameters['path']
    return if patharray.blank? or patharray.empty?
    path = ''
    patharray.each{|el| path << '/' + el}
    path = url_encode(path)
    o = ''
    o << '<div id="code_review">' + "\n"
    #o << '<div id="review_comment"/>' + "\n"
    o << '</div>' + "\n"
    url = url_for :controller => 'code_review', :action => 'update_diff_view', :id => project
    o << '<script type="text/javascript">' + "\n"
    o << "document.observe('dom:loaded', function() {" + "\n"
    o << "new Ajax.Updater('code_review', '#{url}', {evalScripts:true, parameters: 'rev=#{rev}&path=#{path}&review_id=#{review_id}&action_type=#{action_name}&rev_to=#{rev_to}'});\n"
    o << "});\n"
    o << '</script>'
    #o <<  wikitoolbar_for('review_comment')

    return o
  end

  def change_repository_view(context)
    project = context[:project]
    controller = context[:controller]
    changesets = controller.get_selected_changesets
    return unless changesets
    o = ''
    o << '<script type="text/javascript">'
    o << "\n"
    changesets.each{|changeset|
      if changeset.review_count > 0
        progress = '<span style="white-space: nowrap">' + progress_bar([changeset.closed_review_pourcent, changeset.completed_review_pourcent],
          :width => '60px',
          :legend => "#{sprintf("%0.1f", changeset.completed_review_pourcent)}%") + '</span>' +
          '<p class="progress-info">' + "#{changeset.closed_review_count} #{l(:label_closed_issues)}" +
          "   #{changeset.open_review_count} #{l(:label_open_issues)}" + '</p>'
      else
        progress = '<p class="progress-info">' + l(:lable_no_code_reviews) + '</p>'
      end

      o << "var count = new ReviewCount(#{changeset.review_count}, #{changeset.open_review_count}, '#{progress}');"
      o << "\n"
      o << "review_counts['revision_#{changeset.revision}'] = count;"
      o << "\n"
    }
    o << "UpdateRepositoryView('#{l(:code_reviews)}');"
    o << "\n"
    o << '</script>'
    o << "\n"

    return o
  end

  def change_revision_view(context)
    project = context[:project]
    controller = context[:controller]
    changesets = controller.get_selected_changesets
    changeset = changesets[0]
    o = ''
    o << '<script type="text/javascript">' + "\n"
    urlprefix = url_for(:controller => 'repositories', :action => 'entry', :id => project)
    o << "urlprefix = '#{urlprefix}';\n"
    
    changeset.changes.each{|change|
      o << "var reviewlist = [];\n"
      cnt = 0
      change.code_reviews.each {|review|
        issue = review.issue
        o << "var review = new CodeReview(#{review.id});\n"
        url = link_to('#' + "#{issue.id} #{review.subject}(#{issue.status})",
        :controller => 'code_review', :action => 'show', :id => project, :review_id => review.id)
        o << "review.url = '#{url}';\n"
        o << "review.is_closed = true;\n" if review.is_closed?
        o << "reviewlist[#{cnt}] = review;\n"
        cnt += 1
        
      }
      relative_path = change.relative_path
      if relative_path[0] != ?/
        relative_path = '/' + relative_path
      end
      o << "code_reviews_map['#{relative_path}'] = reviewlist;\n"
     
    }
    
    o << "UpdateRevisionView();"
    o << '</script>'
    return o
  end

  def code_review_setting_exists?(project)
    setting = CodeReviewProjectSetting.find(:first, :conditions => ['project_id = ?', project.id])
    return false unless setting
    return false unless setting.tracker_id
    return true
  end
end
