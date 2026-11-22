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
require 'projects_controller'

# Re-raise errors caught by the controller.
class ProjectsController; def rescue_action(e) raise e end; end

class ProjectsControllerTest < ActionController::TestCase
  fixtures :projects, :versions, :users, :roles, :members, :member_roles, :issues, :journals, :journal_details,
           :trackers, :projects_trackers, :issue_statuses, :enabled_modules, :enumerations, :boards, :messages,
           :attachments, :custom_fields, :custom_values, :time_entries

  def setup
    @controller = ProjectsController.new
    @request = ActionController::TestRequest.create(self.class.controller_class)
  end

  context "#settings" do
    context "by anonymous" do
      setup do
        @request.session[:user_id] = User.anonymous.id
      end

      should "302 get" do
        get :settings, :params => {:id => 1}
        assert_response 302
      end

      should "302 post" do
        get :settings, :params => {:id => 1}
        assert_response 302
      end

      context "with permission" do
        setup do
          Role.anonymous.add_permission! :edit_project
        end

        should "not exist tag id get" do
          get :settings, :params => {:id => 1}
          assert_response :success
          assert_template 'settings'
          assert_select 'div.tabs ul li a#tab-code_review', false
        end

        should "not exist tag id post" do
          post :settings, :params => {:id => 1}
          assert_response :success
          assert_template 'settings'
          assert_select 'div.tabs ul li a#tab-code_review', false
        end

        context "and module" do
          setup do
            FactoryBot.create(:enabled_module, project_id: 1, name: 'code_review')
          end

          should "not exist tag id get" do
            get :settings, :params => {:id => 1}
            assert_response :success
            assert_template 'settings'
            assert_select 'div.tabs ul li a#tab-code_review', false
          end

          should "not exist tag id post" do
            post :settings, :params => {:id => 1}
            assert_response :success
            assert_template 'settings'
            assert_select 'div.tabs ul li a#tab-code_review', false
          end
        end
      end
    end

    context "by non member" do
      setup do
        @request.session[:user_id] = 9
      end

      should "403 get" do
        get :settings, :params => {:id => 1}
        assert_response 403
      end

      should "403 post" do
        get :settings, :params => {:id => 1}
        assert_response 403
      end

      context "with permission" do
        setup do
          Role.non_member.add_permission! :edit_project
        end

        should "not exist tag id get" do
          get :settings, :params => {:id => 1}
          assert_response :success
          assert_template 'settings'
          assert_select 'div.tabs ul li a#tab-code_review', false
        end

        should "not exist tag id post" do
          post :settings, :params => {:id => 1}
          assert_response :success
          assert_template 'settings'
          assert_select 'div.tabs ul li a#tab-code_review', false
        end

        context "and module" do
          setup do
            FactoryBot.create(:enabled_module, project_id: 1, name: 'code_review')
          end

          should "not exist tag id get" do
            get :settings, :params => {:id => 1}
            assert_response :success
            assert_template 'settings'
            assert_select 'div.tabs ul li a#tab-code_review', false
          end

          should "not exist tag id post" do
            post :settings, :params => {:id => 1}
            assert_response :success
            assert_template 'settings'
            assert_select 'div.tabs ul li a#tab-code_review', false
          end
        end
      end
    end

    context "by member" do
      setup do
        @request.session[:user_id] = 2
        Role.find(1).remove_permission! :edit_project
      end

      should "not exist tag id get" do
        get :settings, :params => {:id => 1}
        assert_response :success
        assert_template 'settings'
        assert_select 'div.tabs ul li a#tab-code_review', false
      end

      should "not exist tag id post" do
        get :settings, :params => {:id => 1}
        assert_response :success
        assert_template 'settings'
        assert_select 'div.tabs ul li a#tab-code_review', false
      end

      context "with permission" do
        setup do
          Role.find(1).add_permission! :edit_project
        end

        should "not exist tag id get" do
          get :settings, :params => {:id => 1}
          assert_response :success
          assert_template 'settings'
          assert_select 'div.tabs ul li a#tab-code_review', false
        end

        should "not exist tag id post" do
          post :settings, :params => {:id => 1}
          assert_response :success
          assert_template 'settings'
          assert_select 'div.tabs ul li a#tab-code_review', false
        end

        context "and module" do
          setup do
            FactoryBot.create(:enabled_module, project_id: 1, name: 'code_review')
          end

          should "not exist tag id get" do
            get :settings, :params => {:id => 1}
            assert_response :success
            assert_template 'settings'
            assert_select 'div.tabs ul li a#tab-code_review', false
          end

          should "not exist tag id post" do
            post :settings, :params => {:id => 1}
            assert_response :success
            assert_template 'settings'
            assert_select 'div.tabs ul li a#tab-code_review', false
          end
        end
      end
    end

    context "by admin user with the code_review module" do
      setup do
        @request.session[:user_id] = 1
        FactoryBot.create(:enabled_module, project_id: 1, name: 'code_review')
      end

      # The page's own wiki toolbar already loads jstoolbar.js; loading it a second time
      # raises "Identifier 'lastJstPreviewed' has already been declared" in the browser.
      should "load jstoolbar.js only once" do
        get :settings, :params => {:id => 1}
        assert_response :success
        assert_equal 1, response.body.scan(%r{jstoolbar/jstoolbar[-.0-9a-f]*\.js}).size
      end
    end

    context "by admin user with the code_review module and a repository" do
      setup do
        @request.session[:user_id] = 1
        FactoryBot.create(:enabled_module, project_id: 1, name: 'code_review')
        CodeReviewProjectSetting.find_or_create(Project.find(1))
      end

      # A required select inside the hidden auto-assign block blocks the browser's form
      # submission without any message, so the settings could not be saved at all.
      should "not require the auto-assign author while auto-assign is disabled" do
        get :settings, :params => {:id => 1, :tab => 'code_review'}
        assert_response :success
        assert_select 'select#auto_assign_author_id'
        assert_select 'select#auto_assign_author_id[required]', false
      end

      should "require the auto-assign author while auto-assign is enabled" do
        settings = CodeReviewAutoAssignSettings::AutoAssignSettings.new
        settings.enabled = true
        setting = CodeReviewProjectSetting.find_or_create(Project.find(1))
        setting.update!(auto_assign: settings.to_s)
        get :settings, :params => {:id => 1, :tab => 'code_review'}
        assert_response :success
        assert_select 'select#auto_assign_author_id[required]'
      end
    end

    context "by admin user" do
      setup do
        @request.session[:user_id] = 1
        Role.find(1).remove_permission! :edit_project
      end

      should "not exist tag id get" do
        get :settings, :params => {:id => 1}
        assert_response :success
        assert_template 'settings'
        assert_select 'div.tabs ul li a#tab-code_review', false
      end

      should "not exist tag id post" do
        get :settings, :params => {:id => 1}
        assert_response :success
        assert_template 'settings'
        assert_select 'div.tabs ul li a#tab-code_review', false
      end

      context "with permission" do
        setup do
          Role.find(1).add_permission! :edit_project
        end

        should "not exist tag id get" do
          get :settings, :params => {:id => 1}
          assert_response :success
          assert_template 'settings'
          assert_select 'div.tabs ul li a#tab-code_review', false
        end

        should "not exist tag id post" do
          post :settings, :params => {:id => 1}
          assert_response :success
          assert_template 'settings'
          assert_select 'div.tabs ul li a#tab-code_review', false
        end

        context "and module" do
          setup do
            FactoryBot.create(:enabled_module, project_id: 1, name: 'code_review')
          end

          should "exist tag id get" do
            get :settings, :params => {:id => 1}
            assert_response :success
            assert_template 'settings'
            assert_select 'div.tabs ul li a#tab-code_review'
          end

          should "exist tag id post" do
            post :settings, :params => {:id => 1}
            assert_response :success
            assert_template 'settings'
            assert_select 'div.tabs ul li a#tab-code_review'
          end
        end
      end
    end
  end
end
