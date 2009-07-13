require File.dirname(__FILE__) + '/../test_helper'

class CodeReviewChangePatchTest < Test::Unit::TestCase
  fixtures :code_reviews, :projects, :users, :repositories, :changesets, :changes, :issues, :issue_statuses

  def test_review_count
    change = Change.find(2)
    assert_equal(2, change.review_count)
  end

  def test_open_review_count
    change = Change.find(2)
    assert_equal(2, change.open_review_count)
    issue = Issue.find(1)
    issue.status_id = 5
    issue.save
    change = Change.find(2)
    assert_equal(1, change.open_review_count)

  end

  def test_closed_review_count
    change = Change.find(2)
    assert_equal(0, change.closed_review_count)
    issue = Issue.find(1)
    issue.status_id = 5
    issue.save
    change = Change.find(2)
    assert_equal(1, change.closed_review_count)
  end
end
