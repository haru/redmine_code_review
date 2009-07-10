require File.dirname(__FILE__) + '/../test_helper'

class CodeReviewChangePatchTest < Test::Unit::TestCase
  fixtures :code_reviews, :projects, :users, :repositories, :changesets, :changes

  def test_review_count
    change = Change.find(1)
    assert_equal(2, change.review_count)
  end

  def test_open_review_count
   
    review = CodeReview.find(4)
    review.close
    review.save
    change = Change.find(1)
    assert_equal(1, change.open_review_count)
  end

  def test_closed_review_count
    change = Change.find(1)
    assert_equal(1, change.closed_review_count)
  end
end
