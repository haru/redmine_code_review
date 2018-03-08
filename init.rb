# Code Review plugin for Redmine
# Copyright (C) 2009-2017  Haruyuki Iida
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
require 'redmine'

require 'code_review_application_hooks'
require 'code_review_issue_hooks'

Rails.configuration.to_prepare do
  unless Change.included_modules.include? CodeReviewChangePatch
    Change.send(:include, CodeReviewChangePatch)
  end

  CodeReviewChangesetPatch.apply

  unless Issue.included_modules.include? CodeReviewIssuePatch
    Issue.send(:include, CodeReviewIssuePatch)
  end

  ProjectsController.send :helper, CodeReviewProjectSettingsTab

  unless Attachment.included_modules.include? CodeReviewAttachmentPatch
    Attachment.send(:include, CodeReviewAttachmentPatch)
  end

end

Redmine::Plugin.register :redmine_code_review do
  name 'Redmine Code Review plugin'
  author 'Haruyuki Iida'
  author_url 'http://twitter.com/haru_iida'
  url "http://www.r-labs.org/projects/show/codereview" if respond_to?(:url)
  description 'This is a Code Review plugin for Redmine'
  version '0.9.0'
  requires_redmine :version_or_higher => '3.4.0'

  project_module :code_review do
    permission :view_code_review, {:code_review => [:update_diff_view, :update_attachment_view, :update_revisions_view, :index, :show]}, {:read => true}
    permission :add_code_review, {:code_review => [:new, :reply, :forward_to_revision, :preview]}, :require => :member
    permission :edit_code_review, {:code_review => [:update]}, :require => :member
    permission :delete_code_review, {:code_review => [:destroy]}, :require => :member
    permission :assign_code_review, {:code_review => [:assign]}, :require => :member
    permission :code_review_setting, {:code_review_settings => [:show, :update, :add_filter, :edit_filter, :sort]}, :require => :member

  end

  menu :project_menu, :code_review, { :controller => 'code_review', :action => 'index' }, :caption => :code_reviews,
    :if => Proc.new{|project|
    setting = CodeReviewProjectSetting.find_or_create(project)
    project.repository != nil  and setting and !setting.hide_code_review_tab
  }, :after => :repository


  Redmine::WikiFormatting::Macros.register do
    desc "This is my macro link to code review"
    macro :review do |obj, args|
      return nil if args.length == 0
      review_id = args[0].to_i
      return nil if review_id == 0
      review = CodeReview.find(review_id)
      return nil unless review
      link_to(l(:label_review) + '#' + review.id.to_s, :controller => 'code_review', :action => 'show', :id => review.project, :review_id => review.id)

    end
  end

end
