require 'redmine'
require 'code_review_application_hooks'


Redmine::Plugin.register :redmine_code_review do
  name 'Redmine Code Review plugin'
  author 'Haru Iida'
  description 'This is a Code Review plugin for Redmine'
  version '0.0.1'
  requires_redmine :version_or_higher => '0.8.0'

  project_module :code_review do
    permission :view_code_review, {:code_review => [:update_diff_view, :index, :show]}
    permission :add_code_review, {:code_review => [:new, :reply]}, :require => :member
    permission :edit_code_review, {:code_review => [:update]}, :require => :member
    permission :delete_code_review, {:code_review => [:destroy]}, :require => :member
  end

  menu :project_menu, :code_review, { :controller => 'code_review', :action => 'index' }, :caption => :code_reviews,
    :if => Proc.new{|project| project.repository != nil}
end
