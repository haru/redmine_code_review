class CodeReviewApplicationHooks < Redmine::Hook::ViewListener

  def view_layouts_base_html_head(context = {})
    project = context[:project]
    unless User.current.allowed_to?({:controller => 'code_review', :action => 'update_diff_view'}, project)
      return
    end
    controller = context[:controller]
    action_name = controller.action_name
    return '' unless (controller.class.name == 'RepositoriesController' and action_name == 'diff')

    baseurl = url_for(:controller => 'code_review', :action => 'index', :id => project) + '/../../..'
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
    unless User.current.allowed_to?({:controller => 'code_review', :action => 'update_diff_view'}, project)
      return
    end
    controller = context[:controller]
    action_name = controller.action_name
    return '' unless (controller.class.name == 'RepositoriesController' and action_name == 'diff')
    request = context[:request]
    parameters = request.parameters
    review_id = parameters['review_id']
    rev = parameters['rev']
    patharray = parameters['path']
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
