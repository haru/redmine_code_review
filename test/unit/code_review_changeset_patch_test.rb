require File.dirname(__FILE__) + '/../test_helper'

class CodeReviewChangesetPatchTest < Test::Unit::TestCase
  fixtures :code_reviews, :projects, :users, :repositories, :changesets, :changes

  def test_review_count
    changeset = Changeset.find(100)
    assert_equal(2, changeset.review_count)
  end

  def test_open_review_count
    changeset = Changeset.find(100)
    assert_equal(2, changeset.open_review_count)
  end

  def test_closed_review_count
    changeset = Changeset.find(100)
    assert_equal(0, changeset.closed_review_count)
  end
end
