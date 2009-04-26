class CodeReviewApplicationHooks < Redmine::Hook::ViewListener

  def view_layouts_base_html_head(context = {})
    project = context[:project]
    unless User.current.allowed_to?({:controller => 'code_review', :action => 'update_diff_view'}, project)
      return
    end
    controller = context[:controller]
    action_name = controller.action_name
    return '' unless (controller.class.name == 'RepositoriesController' and action_name == 'diff')

    o = ""
    o << javascript_include_tag("code_review.js", :plugin => "redmine_code_review")
    o << javascript_include_tag('jstoolbar/jstoolbar')
    o << javascript_include_tag('jstoolbar/textile')
    o << javascript_include_tag("jstoolbar/lang/jstoolbar-#{project.current_language}")

    o << stylesheet_link_tag("code_review.css", :plugin => "redmine_code_review", :media => "screen")

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
    o << "new Ajax.Updater('code_review', '#{url}', {evalScripts:true, parameters: 'rev=#{rev}&path=#{path}'});\n"
    o << "});\n"
    o << '</script>'
    #o <<  wikitoolbar_for('review_comment')

    return o
  end
end
