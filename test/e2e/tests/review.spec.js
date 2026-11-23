const { test, expect } = require('../support/fixtures');
const { seed, changesetDiffUrl, fileDiffUrl, login, openReviewForm, applyReview, createReview } = require('../support/helpers');

test('shows a created review again after reloading the diff', async ({ page }) => {
  await login(page);
  const { id } = await createReview(page, 'E2E review reload');

  await page.reload();
  await expect(page.locator(`#review_${id} img`)).toBeVisible();
});

test('keeps the dialog open with an error when the subject is empty', async ({ page }) => {
  await login(page);
  await openReviewForm(page);
  const iconsBefore = await page.locator('span[id^="review_"] img').count();
  const response = await applyReview(page);
  expect(await response.text()).not.toContain('data-cr-review-id');
  await expect(page.locator('#errorExplanation')).toContainText('Subject');
  await expect(page.locator('#review_subject')).toBeVisible();
  await expect(page.locator('span[id^="review_"] img')).toHaveCount(iconsBefore);
});

test('opens an existing review from its icon', async ({ page }) => {
  await login(page);
  const { id } = await createReview(page, 'E2E review to open');

  await page.locator(`#review_${id} img`).click();
  await expect(page.locator(`#show_review_${id}`)).toContainText('E2E review to open');
});

test('creates a review from the side-by-side diff', async ({ page }) => {
  await login(page);
  await createReview(page, 'E2E review sbs', fileDiffUrl('type=sbs'));
});

test('creates a review from the whole-changeset diff', async ({ page }) => {
  await login(page);
  await createReview(page, 'E2E review changeset', changesetDiffUrl());
});

test('fills in the suggested parent issue when the suggestion is accepted', async ({ page }) => {
  const { revision, parentIssue } = seed.parentSuggestion;
  await login(page);
  // The seeded first commit is linked to a child issue whose parent is suggested.
  await openReviewForm(page, `/projects/${seed.project}/repository/${seed.repository}/revisions/${revision}/diff`);

  await expect(page.locator('#review_parent_id')).toHaveValue('');
  const suggestion = page.locator('#review-form p', { has: page.locator('#review_parent_id') });
  await expect(suggestion.getByRole('link', { name: new RegExp(`#${parentIssue}\\b`) })).toBeVisible();
  await suggestion.getByRole('button', { name: 'Yes' }).click();
  await expect(page.locator('#review_parent_id')).toHaveValue(String(parentIssue));
});
