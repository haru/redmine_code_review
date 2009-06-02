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

class CodeReviewApplicationHooks < Redmine::Hook::ViewListener

  def view_layouts_base_html_head(context = {})
    project = context[:project]
    return '' unless project
    controller = context[:controller]
    return '' unless controller
    action_name = controller.action_name
    return '' unless action_name
    baseurl = url_for(:controller => 'code_review', :action => 'index', :id => project) + '/../../..'

    if (controller.class.name == 'ProjectsController' and action_name == 'activity')
      o = ""
      o << stylesheet_link_tag(baseurl + "/plugin_assets/redmine_code_review/stylesheets/activity.css")
      return o
    end
    unless User.current.allowed_to?({:controller => 'code_review', :action => 'update_diff_view'}, project)
      return ''
    end
    
    return '' unless (controller.class.name == 'RepositoriesController' and action_name == 'diff')

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
    controller = context[:controller]
    return '' unless controller
    action_name = controller.action_name
    return '' unless action_name
    return '' unless (controller.class.name == 'RepositoriesController' and action_name == 'diff')
    request = context[:request]
    parameters = request.parameters
    return unless parameters['rev_to'].blank?
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
    o << "new Ajax.Updater('code_review', '#{url}', {evalScripts:true, parameters: 'rev=#{rev}&path=#{path}&review_id=#{review_id}'});\n"
    o << "});\n"
    o << '</script>'
    #o <<  wikitoolbar_for('review_comment')

    return o
  end
end
