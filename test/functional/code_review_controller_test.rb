require File.dirname(__FILE__) + '/../test_helper'

class CodeReviewControllerTest < ActionController::TestCase
  fixtures :code_reviews, :projects, :users, :repositories, :changesets, :changes, :members, :roles
  def setup
    @controller = CodeReviewController.new
    @request    = ActionController::TestRequest.new
    @response   = ActionController::TestResponse.new
    @request.env["HTTP_REFERER"] = '/'
    enabled_module = EnabledModule.new
    enabled_module.project_id = 1
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
  end

  def test_new
    @request.session[:user_id] = 1
    get :new, :id => 1
    assert_response :success
    assert_template '_new_form'

  end
end
