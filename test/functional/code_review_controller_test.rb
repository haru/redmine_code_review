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
require File.dirname(__FILE__) + '/../test_helper'

class CodeReviewControllerTest < ActionController::TestCase
  fixtures :code_reviews, :projects, :users, :repositories,
    :changesets, :changes, :members, :roles, :issues, :issue_statuses,
    :enumerations, :issue_categories, :trackers, :trackers, :projects, :projects_trackers,
    :code_review_project_settings
  def setup
    @controller = CodeReviewController.new
    @request    = ActionController::TestRequest.new
    @response   = ActionController::TestResponse.new
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
    roles = Role.find(:all)
    roles.each {|role|
      role.permissions << :view_code_review
      role.save
    }
  end

  def test_index
    @request.session[:user_id] = 1
    get :index, :id => 1
    assert_response :success

    get :index, :id => 2
    assert_response 302
  end

  def test_index_show_closed
    @request.session[:user_id] = 1
    get :index, :id => 1, :show_closed => true
    assert_response :success
  end

  def test_new
    @request.session[:user_id] = 1
    get :new, :id => 1, :action_type => 'diff', :rev => 5
    assert_response :success
    assert_template '_new_form'

    count = CodeReview.find(:all).length
    post :new, :id => 1, :review => {:line => 1, :change_id => 1,
      :comment => 'aaa', :subject => 'bbb'}, :action_type => 'diff'
    assert_response :success
    assert_template '_add_success'
    assert_equal(count + 1, CodeReview.find(:all).length)

    get :new, :id => 1, :action_type => 'diff', :rev => 5
    assert_response :success
    assert_template '_new_form'


  end

  def test_show
    @request.session[:user_id] = 1
    get :show, :id => 1, :review_id => 9
    assert_response 302
    #assert_template '_show'
  end

  def test_destroy
    count = CodeReview.find(:all).length
    @request.session[:user_id] = 1
    get :destroy, :id => 1, :review_id => 9
    assert_response :success
    assert_equal(count - 1, CodeReview.find(:all).length)
    
  end

  def test_reply
    @request.session[:user_id] = 1
    
    review = CodeReview.find(9)
    get :reply, :id => 1, :review_id => 9,
      :reply => {:comment => 'aaa'}, :issue=> {:lock_version => review.issue.lock_version}
    assert_response :success
    assert_template '_show'
    assert_equal(nil, assigns(:error))
  end

  def test_reply_lock_error
    @request.session[:user_id] = 1
    get :reply, :id => 1, :review_id => 9,
      :reply => {:comment => 'aaa'}, :issue=> {:lock_version => 1}
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
    post :update, :id => 1, :review_id => review_id,
      :review => {:comment => 'bbb', :lock_version => review.lock_version},
      :issue => {:lock_version => review.issue.lock_version}
    assert_response :success
    review = CodeReview.find(review_id)
    assert_equal('bbb', review.comment)
  end

  def test_update_lock_error
    @request.session[:user_id] = 1
    review_id = 9
    review = CodeReview.find(review_id)
    assert_equal('Unable to print recipes', review.comment)
    post :update, :id => 1, :review_id => review_id,
      :review => {:comment => 'bbb', :lock_version => review.lock_version},
      :issue => {:lock_version => 1}
    assert_response :success
    review = CodeReview.find(review_id)
    assert_equal('Unable to print recipes', review.comment)
    assert assigns(:error)
  end

  def test_update_diff_view
    @request.session[:user_id] = 1
    review_id = 9
    review = CodeReview.find(review_id)
    assert_equal('Unable to print recipes', review.comment)
    post :update_diff_view, :id => 1, :review_id => review_id, :rev => 1, :path => '/test/some/path/in/the/repo'
    assert_response :success
    review = CodeReview.find(review_id)
  end
end
