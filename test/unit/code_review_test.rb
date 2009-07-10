require File.dirname(__FILE__) + '/../test_helper'

class CodeReviewTest < Test::Unit::TestCase
  fixtures :code_reviews, :projects, :users, :repositories, :changesets, :changes

  # Create new object.
  def test_create
    code_review = CodeReview.new
    assert !code_review.save
    code_review.project_id = 1;
    code_review.comment = "aaa"
    code_review.user_id = 1;
    code_review.change_id = 1;
    code_review.updated_by_id = 1;


    assert code_review.save
    code_review.destroy
  end

  def test_close
    code_review = newreview
    assert !code_review.is_closed?
    code_review.close
    assert code_review.is_closed?
  end

  def test_reopen
    code_review = newreview
    code_review.close
    assert code_review.is_closed?
    code_review.reopen
    assert !code_review.is_closed?
  end

  def test_committer
    code_review = CodeReview.find(1)
    assert_equal(3, code_review.committer.id)
  end

  def test_lastchild
    code_review = CodeReview.find(1)
    assert_equal(4, code_review.lastchild.id)
  end

  def test_users
    code_review = CodeReview.find(1)
    users = code_review.users
    assert_equal(3, users.length)
  end

  def test_path
    code_review = CodeReview.find(1)
    assert_equal("/test/some/path/in/the/repo", code_review.path)
  end

  def test_revision
    code_review = CodeReview.find(1)
    assert_equal("1", code_review.revision)
  end

  def test_repository
    code_review = CodeReview.find(1)
    assert_equal(10, code_review.repository.id)
  end

  private
  def newreview
    code_review = CodeReview.new
    code_review.project_id = 1;
    code_review.comment = "aaa"
    code_review.user_id = 1;
    code_review.change_id = 1;
    code_review.updated_by_id = 1;
    return code_review
  end

  def test_is_closed?
    review = CodeReview.find(1)
    assert !review.is_closed?
    review = CodeReview.find(4)
    assert review.is_closed?
  end
end
