require 'redmine'
require 'code_review_application_hooks'

Redmine::Plugin.register :redmine_code_review do
  name 'Redmine Code Review plugin'
  author 'Author name'
  description 'This is a plugin for Redmine'
  version '0.0.1'

  project_module :code_review do
    permission :view_code_review, {:code_review => [:update_diff_view, :index, :show]}
    permission :add_code_review, {:code_review => [:new]}, :require => :member
  end

  menu :project_menu, :code_review, { :controller => 'code_review', :action => 'index' }, :caption => :code_reviews
end
