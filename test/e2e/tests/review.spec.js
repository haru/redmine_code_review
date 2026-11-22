const { test, expect } = require('@playwright/test');
const { changesetDiffUrl, fileDiffUrl, login, openReviewForm, applyReview, createReview } = require('../support/helpers');

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
  expect(await response.text()).not.toContain('var review_id');
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
