const { test, expect } = require('@playwright/test');
const { seed, fileDiffUrl, login, createReview } = require('../support/helpers');

test('a view-only member sees reviews but cannot add one', async ({ page }) => {
  await login(page);
  const { id } = await createReview(page, 'E2E review for viewer');
  await page.context().clearCookies();

  await login(page, 'viewer');
  await page.goto(fileDiffUrl());
  await expect(page.locator(`#review_${id} img`)).toBeVisible();
  await expect(page.locator('img[id^="add_revew_img_"]')).toHaveCount(0);

  // Hiding the icon is not authorization: the server must reject a direct create request.
  // (The test environment disables CSRF protection, so no token is needed.)
  const reviewIcons = page.locator('[id^="review_"] img');
  const before = await reviewIcons.count();
  const response = await page.request.post(`/projects/${seed.project}/code_review/new`, {
    form: { 'review[subject]': 'forged by viewer', 'review[line]': '1', 'review[file_path]': seed.path },
  });
  expect(response.status()).toBe(403);
  await page.goto(fileDiffUrl());
  await page.waitForLoadState('networkidle');
  await expect(reviewIcons).toHaveCount(before);
});
