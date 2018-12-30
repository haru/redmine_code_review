# Code Review plugin for Redmine
# Copyright (C) 2009-2012  Haruyuki Iida
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

class CodeReviewControllerTest < ActionController::TestCase
  fixtures :code_reviews, :projects, :users, :repositories,
    :changesets, :changes, :members, :member_roles, :roles, :issues, :issue_statuses,
    :enumerations, :issue_categories, :trackers, :projects, :projects_trackers,
    :code_review_project_settings, :attachments, :code_review_assignments,
    :code_review_user_settings

  def setup
    @controller = CodeReviewController.new
    @request = ActionController::TestRequest.create(self.class.controller_class)
    @request.env["HTTP_REFERER"] = '/'
    enabled_module = EnabledModule.new
    enabled_module.project_id = 1
    enabled_module.name = 'code_review'
    enabled_module.save
    enabled_module = EnabledModule.new
    enabled_module.project_id = 2
    enabled_module.name = 'code_review'
    enabled_module.save

    User.current = nil
    roles = Role.all
    roles.each { |role|
      role.permissions << :view_code_review
      role.save
    }
  end

  context "index" do
    should "show review list" do
      @request.session[:user_id] = 1
      get :index, :params => {:id => 1}
      assert_response :success
    end

    should "not show review list if module was not enabled." do
      @request.session[:user_id] = 1
      get :index, :params => {:id => 3}
      assert_response 403
    end

    should "show all review list if show_closed is true" do
      @request.session[:user_id] = 1
      get :index, :params => {:id => 1, :show_closed => true}
      assert_response :success
    end
  end

  context "new" do
    should "create form when get mthod" do
      @request.session[:user_id] = 1
      get :new, :params => {:id => 1, :action_type => 'diff', :rev => 5}
      assert_response :success
      assert_template '_new_form'
    end

    should "create new review" do
      @request.session[:user_id] = 1
      count = CodeReview.all.length
      post :new, :params => {:id => 1, :review => {:line => 1, :change_id => 1,
                                                :comment => 'aaa', :subject => 'bbb'}, :action_type => 'diff'}
      assert_response :success
      assert_template '_add_success'
      assert_equal(count + 1, CodeReview.all.length)

      get :new, :params => {:id => 1, :action_type => 'diff', :rev => 5}
      assert_response :success
      assert_template '_new_form'
    end

    should "create new review when changeset has related issue" do
      @request.session[:user_id] = 1
      project = Project.find(1)
      change = Change.find(3)
      changeset = change.changeset
      issue = Issue.generate!(:project => project)
      changeset.issues << issue
      changeset.save
      count = CodeReview.all.length
      post :new, :params => {:id => 1, :review => {:line => 1, :change_id => 3,
                                                :comment => 'aaa', :subject => 'bbb'}, :action_type => 'diff'}
      assert_response :success
      assert_template '_add_success'
      assert_equal(count + 1, CodeReview.all.length)

      settings = CodeReviewProjectSetting.all
      settings.each { |setting|
        setting.destroy
      }
      post :new, :params => {:id => 1, :review => {:line => 1, :change_id => 1,
                                                :comment => 'aaa', :subject => 'bbb'}, :action_type => 'diff'}
      assert_response 200
    end

    should "save safe_attributes" do
      @request.session[:user_id] = 1
      project = Project.find(1)
      change = Change.find(3)
      changeset = change.changeset
      issue = Issue.generate!(:project => project)
      changeset.issues << issue
      changeset.save
      count = CodeReview.all.length
      post :new, :params => {:id => 1, :review => {:line => 10, :change_id => 3,
                                                :comment => 'aaa', :subject => 'bbb', :parent_id => 1, :status_id => 1}, :action_type => 'diff'}
      assert_response :success
      assert_template '_add_success'

      review = assigns :review
      assert_equal(1, review.project_id)
      assert_equal(3, review.change_id)
      assert_equal("bbb", review.subject)
      assert_equal(1, review.parent_id)
      assert_equal("aaa", review.comment)
      assert_equal(1, review.status_id)
    end

    should "create review for attachment" do
      @request.session[:user_id] = 1
      project = Project.find(1)
      issue = Issue.generate!(:project => project)
      attachment = FactoryBot.create(:attachment, container: issue)
      count = CodeReview.all.length
      post :new, :params => {:id => 1, :review => {:line => 1, :comment => 'aaa',
                                                :subject => 'bbb', :attachment_id => attachment.id}, :action_type => 'diff'}
      assert_response :success
      assert_template '_add_success'
      assert_equal(count + 1, CodeReview.all.length)
    end
  end

  def test_show
    @request.session[:user_id] = 1
    get :show, :params => {:id => 1, :review_id => 9}
    assert_response 302
    #assert_template '_show'
  end

  context "show" do
    should "be success with review_id" do
      @request.session[:user_id] = 1
      get :show, :params => {:id => 1, :review_id => 9}
      assert_response 302
      #assert_template '_show'
    end
    should "be success with assignment_id" do
      @request.session[:user_id] = 1
      get :show, :params => {:id => 1, :assignment_id => 1}
      assert_response 302
      #assert_template '_show'
    end
  end

  def test_destroy
    project = Project.find(1)
    issue = Issue.generate!(:project => project)
    review = FactoryBot.create(:code_review, project: project)
    count = CodeReview.all.length
    @request.session[:user_id] = 1
    get :destroy, :params => {:id => 1, :review_id => review.id}
    assert_response :success
    assert_equal(count - 1, CodeReview.all.length)
  end

  context "reply" do
    should "create reply for review" do
      @request.session[:user_id] = 1

      review = CodeReview.find(9)
      get :reply, :params => {:id => 1, :review_id => 9,
                            :reply => {:comment => 'aaa'}, :issue => {:lock_version => review.issue.lock_version}}
      assert_response :success
      assert_template '_show'
      assert_nil assigns(:error)
    end

    should "not create reply if anyone replied sametime" do
      @request.session[:user_id] = 1

      review = CodeReview.find(9)
      get :reply, :params => {:id => 1, :review_id => 9,
                            :reply => {:comment => 'aaa'}, :issue => {:lock_version => review.issue.lock_version + 1}}
      assert_response :success
      assert_template '_show'
      assert_not_nil assigns(:error)
    end
  end

  def test_reply_lock_error
    @request.session[:user_id] = 1
    get :reply, :params => {:id => 1, :review_id => 9,
                          :reply => {:comment => 'aaa'}, :issue => {:lock_version => 1}}
    assert_response :success
    assert_template '_show'
    assert assigns(:error)
  end

  #  def test_close
  #    @request.session[:user_id] = 1
  #    review_id = 9
  #    review = CodeReview.find(review_id)
  #    review.reopen
  #    review.save
  #    assert !review.is_closed?
  #    get :close, :id => 1, :review_id => review_id
  #    assert_response :success
  #    assert_template '_show'
  #    review = CodeReview.find(review_id)
  #    assert review.is_closed?
  #  end
  #
  #  def test_reopen
  #    @request.session[:user_id] = 1
  #    review = CodeReview.find(1)
  #    review.close
  #    review.save
  #    assert review.is_closed?
  #    get :reopen, :id => 1, :review_id => 1
  #    assert_response :success
  #    assert_template '_show'
  #    review = CodeReview.find(1)
  #    assert !review.is_closed?
  #  end

  def test_update
    @request.session[:user_id] = 1
    review_id = 9
    review = CodeReview.find(review_id)
    assert_equal('Unable to print recipes', review.comment)
    post :update, :params => {:id => 1, :review_id => review_id,
                           :review => {:comment => 'bbb', :lock_version => review.lock_version},
                           :issue => {:lock_version => review.issue.lock_version}}
    assert_response :success
    review = CodeReview.find(review_id)
    assert_equal('bbb', review.comment)
  end

  def test_update_lock_error
    @request.session[:user_id] = 1
    review_id = 9
    review = CodeReview.find(review_id)
    review.save!
    assert_equal('Unable to print recipes', review.comment)
    post :update, :params => {:id => 1, :review_id => review_id,
                           :review => {:comment => 'bbb', :lock_version => review.lock_version},
                           :issue => {:lock_version => 1}}
    assert_not_nil assigns(:error)
    assert_response :success
    review = CodeReview.find(review_id)
    assert_equal('Unable to print recipes', review.comment)
  end

  def test_update_diff_view
    @request.session[:user_id] = 1
    review_id = 9
    review = CodeReview.find(review_id)
    assert_equal('Unable to print recipes', review.comment)
    post :update_diff_view, :params => {:id => 1, :review_id => review_id, :rev => 1, :path => '/test/some/path/in/the/repo'}
    assert_response :success
    review = CodeReview.find(review_id)
  end

  def test_forward_to_revision
    @request.session[:user_id] = 1
    post :forward_to_revision, :params => {:id => 1, :path => '/subversion_test/folder/helloworld.rb'}
  end

  def test_update_attachment_view
    @request.session[:user_id] = 1
    review_id = 9
    review = CodeReview.find(review_id)
    assert_equal('Unable to print recipes', review.comment)
    post :update_attachment_view, :params => {:id => 1, :attachment_id => 1}
    assert_response :success
    review = CodeReview.find(review_id)
  end

  def test_preview
    @request.session[:user_id] = 1
    review = {}
    review[:comment] = 'aaa'
    post :preview, :params => {:id => 1, :review => review}
    assert_response :success
  end

  def test_assign
    @request.session[:user_id] = 1
    post :assign, :params => {:id => 1}
    assert_response :redirect
  end

  context "update_revisions_view" do
    setup do
      @request.session[:user_id] = 1
    end

    should "succeed if changeset_ids is nil" do
      get :update_revisions_view, :params => {:id => 1}
      assert_response :success
      assert_equal(0, assigns(:changesets).length)
    end

    should "succeed if changeset_ids is not nil" do
      get :update_revisions_view, :params => {:id => 1, :changeset_ids => '1,2,3'}
      assert_response :success
      assert_equal(3, assigns(:changesets).length)
    end
  end
end
