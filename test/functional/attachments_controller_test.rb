# Code Review plugin for Redmine
# Copyright (C) 2009-2014  Haruyuki Iida
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

require File.expand_path(File.dirname(__FILE__) + '/../test_helper')
require 'attachments_controller'

# Re-raise errors caught by the controller.
class AttachmentsController; def rescue_action(e) raise e end; end

class AttachmentsControllerTest < ActionController::TestCase
  fixtures :users, :projects, :roles, :members, :member_roles, :enabled_modules, :issues, :trackers, :attachments,
    :versions, :wiki_pages, :wikis, :documents

  def setup
    @controller = AttachmentsController.new
    @request = ActionController::TestRequest.create(self.class.controller_class)
    #@response   = ActionController::TestResponse.new
    Attachment.storage_path = "#{Rails.root}/test/fixtures/files"

    [1, 2].each { |num|
      project = Project.find(num)
      project.enable_module!('code_review')
      project.save!
    }

    roles = Role.all
    roles.each { |role|
      role.permissions << :view_code_review
      role.save
    }
    User.current = nil
  end

  def test_show_diff
    @request.session[:user_id] = 1
    attachment = FactoryBot.create(:attachment, filename: "test.diff")
    get :show, :params => {:id => attachment.id, :type => 'inline'}
    assert_response :success
    assert_template 'diff'
    #assert_equal 'text/html', @response.content_type
  end

  def test_show_text_file
    @request.session[:user_id] = 1
    attachment = FactoryBot.create(:attachment, filename: "test.rb")
    get :show, :params => {:id => attachment.id, :type => 'inline'}
    assert_response :success
    assert_template 'file'
    #assert_equal 'text/html', @response.content_type
  end
end
