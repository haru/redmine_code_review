const { test, expect } = require('@playwright/test');
const { seed, login, createReview } = require('../support/helpers');

test('lists a registered review on the review index', async ({ page }) => {
  const subject = 'E2E review for index';
  await login(page);
  await createReview(page, subject);

  await page.goto(`/projects/${seed.project}/code_review/index`);
  const row = page.locator('#code_review_list tr', { has: page.locator('td.subject', { hasText: subject }) });
  await expect(row).toHaveCount(1);
  await expect(row.locator('td.path')).toContainText('hello.rb');
});
