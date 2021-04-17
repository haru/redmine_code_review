require_dependency 'projects_helper'

module ProjectsHelperMethodsCodeReview
  def self.included(base)
    base.send :include, InstanceMethods

    base.class_eval do
      alias_method :project_settings_tabs_without_code_review, :project_settings_tabs
      alias_method :project_settings_tabs, :project_settings_tabs_with_code_review
    end
  end

  module InstanceMethods
    def project_settings_tabs_with_code_review
      tabs = project_settings_tabs_without_code_review
      tabs.push({ name:       'code_review',
                  controller: 'code_review_settings',
                  action:     :show,
                  partial:    'code_review_settings/show',
                  label:      :code_review}) if User.current.allowed_to?(:show, @project)
      tabs
    end
  end
end

unless ProjectsHelper.included_modules.include?(ProjectsHelperMethodsCodeReview)
  ProjectsHelper.send(:include, ProjectsHelperMethodsCodeReview)
end

