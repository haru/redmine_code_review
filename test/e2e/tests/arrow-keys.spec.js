const { test, expect } = require('../support/fixtures');
const {
  seed, login, waitForAnimations, commitFile, fetchChangesets, createReview, openReview,
} = require('../support/helpers');

const PATCH = [
  '--- a/hello.rb', '+++ b/hello.rb', '@@ -1,2 +1,2 @@', ' puts "a"', '-puts "b"', '+puts "c"', '',
].join('\n');

// Creates an issue with two attached patches, so that the attachment view of the first
// one shows Redmine's previous/next navigation (`.pagination.filepreview`).
async function createIssueWithTwoPatches(page, unique) {
  await page.goto(`/projects/${seed.project}/issues/new`);
  await page.fill('#issue_subject', `E2E arrow keys ${unique}`);
  // One at a time: concurrent uploads make the sqlite test database answer 500.
  for (const [i, n] of ['one', 'two'].entries()) {
    const uploaded = page.waitForResponse((r) => new URL(r.url()).pathname === '/uploads.js');
    await page.locator('input.file_selector').last().setInputFiles(
      { name: `${unique}-${n}.diff`, mimeType: 'text/plain', buffer: Buffer.from(PATCH) },
    );
    expect((await uploaded).status()).toBe(200);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('input[name^="attachments"][name$="[token]"]')).toHaveCount(i + 1);
  }
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page).toHaveURL(/\/issues\/\d+$/);
}

// Types around ← / → in `selector`. If Redmine's file-preview shortcut fires, the page
// navigates away and the field disappears, so the final value and URL prove it did not.
async function typeWithArrowKeys(page, selector, url) {
  await page.fill(selector, 'abc');
  await page.press(selector, 'ArrowLeft');
  await page.keyboard.type('X');
  await page.press(selector, 'ArrowRight');
  await page.keyboard.type('Y');
  await expect(page.locator(selector)).toHaveValue('abXcY');
  expect(page.url()).toBe(url);
}

// Opens the first of two attached patches and returns its url.
async function openFirstPatch(page, unique) {
  await createIssueWithTwoPatches(page, unique);
  await page.getByRole('link', { name: `${unique}-one.diff` }).first().click();
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.pagination.filepreview .next a')).toBeVisible();
  return page.url();
}

test('keeps the arrow keys in the review subject field on a repository file with siblings', async ({ page }) => {
  const unique = `arrow${Date.now()}`;
  commitFile(`auto/${unique}/one.rb`, 'puts 1\n', `arrow one ${unique}`);
  // Both files must exist at the opened revision for Redmine to render the sibling links.
  const revision = commitFile(`auto/${unique}/two.rb`, 'puts 2\n', `arrow two ${unique}`);
  await login(page);
  await fetchChangesets(page, seed.project);

  await page.goto(`/projects/${seed.project}/repository/${seed.repository}/entry/auto/${unique}/one.rb?rev=${revision}`);
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.pagination.filepreview .next a')).toBeVisible();
  const url = page.url();

  await page.locator('img[id^="add_revew_img_"]').first().click();
  await expect(page.locator('#review_subject')).toBeVisible();
  await waitForAnimations(page);
  await typeWithArrowKeys(page, '#review_subject', url);
});

test('keeps the arrow keys in the review comment field instead of navigating to another attachment', async ({ page }) => {
  const unique = `arrow${Date.now()}`;
  await login(page);
  const url = await openFirstPatch(page, unique);

  await page.locator('img[id^="add_revew_img_"]').first().click();
  await expect(page.locator('#review_subject')).toBeVisible();
  await waitForAnimations(page);
  await typeWithArrowKeys(page, '#review_subject', url);
});

test('keeps the arrow keys in the reply field of an existing review', async ({ page }) => {
  const unique = `arrow${Date.now()}`;
  await login(page);
  const url = await openFirstPatch(page, unique);

  const { id } = await createReview(page, `arrow review ${unique}`, url);
  await openReview(page, id);
  await page.locator(`#show_review_${id}`).getByRole('link', { name: 'Reply' }).click();
  await expect(page.locator(`#reply_comment_${id}`)).toBeVisible();
  await typeWithArrowKeys(page, `#reply_comment_${id}`, url);
});

test('still moves to the next attachment with the arrow key when no dialog is open', async ({ page }) => {
  const unique = `arrow${Date.now()}`;
  await login(page);
  const url = await openFirstPatch(page, unique);

  await page.keyboard.press('ArrowRight');
  await expect(page).not.toHaveURL(url);
  await expect(page.locator('#content')).toContainText(`${unique}-two.diff`);
});

test('moves to the previous attachment again after the review dialog was closed', async ({ page }) => {
  const unique = `arrow${Date.now()}`;
  await login(page);
  await openFirstPatch(page, unique);
  await page.locator('.pagination.filepreview .next a').click();
  await page.waitForLoadState('networkidle');
  const secondUrl = page.url();

  await page.locator('img[id^="add_revew_img_"]').first().click();
  await expect(page.locator('#review_subject')).toBeVisible();
  await waitForAnimations(page);
  await page.locator('.ui-dialog-titlebar-close').click();
  await expect(page.locator('#review_subject')).toBeHidden();
  await page.locator('body').click({ position: { x: 1, y: 1 } });

  await page.keyboard.press('ArrowLeft');
  await expect(page).not.toHaveURL(secondUrl);
  await expect(page.locator('#content')).toContainText(`${unique}-one.diff`);
});
