const { test, expect } = require('@playwright/test');
const { loadSeed, login, createReview } = require('../support/helpers');

test('lists a registered review on the review index', async ({ page }) => {
  const seed = loadSeed();
  const subject = 'E2E review for index';
  await login(page);
  await createReview(page, subject);

  await page.goto(`/projects/${seed.project}/code_review/index`);
  await expect(page.locator('#content')).toContainText(subject);
});
