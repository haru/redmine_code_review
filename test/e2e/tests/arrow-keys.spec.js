const { test, expect } = require('../support/fixtures');
const {
  seed, login, commitFile, fetchChangesets, createReview, openReview, openReviewForm,
} = require('../support/helpers');

const PATCH = [
  '--- a/hello.rb', '+++ b/hello.rb', '@@ -1,2 +1,2 @@', ' puts "a"', '-puts "b"', '+puts "c"', '',
].join('\n');

const NEXT_LINK = '.pagination.filepreview .next a';

const uniqueName = () => `arrow${Date.now()}`;

// Creates an issue with two attached patches, so that the attachment view of the first
// one shows Redmine's previous/next navigation (`.pagination.filepreview`).
async function createIssueWithTwoPatches(page, unique) {
  await page.goto(`/projects/${seed.project}/issues/new`);
  await page.fill('#issue_subject', `E2E arrow keys ${unique}`);
  // One at a time: concurrent uploads make the sqlite test database answer 500.
  const names = ['one', 'two'];
  for (let i = 0; i < names.length; i += 1) {
    const uploaded = page.waitForResponse((r) => new URL(r.url()).pathname === '/uploads.js');
    await page.locator('input.file_selector').last().setInputFiles(
      { name: `${unique}-${names[i]}.diff`, mimeType: 'text/plain', buffer: Buffer.from(PATCH) },
    );
    expect((await uploaded).status()).toBe(200);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('input[name^="attachments"][name$="[token]"]')).toHaveCount(i + 1);
  }
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page).toHaveURL(/\/issues\/\d+$/);
}

// Types around ← / → in `selector` and asserts the page did not start to navigate.
// `window.location = ...` navigates asynchronously and the old page keeps accepting keys
// until the new one commits, so the value alone cannot prove it: `beforeunload` fires
// synchronously when the navigation starts, and the flag it sets is read afterwards.
async function typeWithArrowKeys(page, selector, url) {
  await page.evaluate(() => {
    window.__left = false;
    window.addEventListener('beforeunload', () => { window.__left = true; });
  });
  await page.fill(selector, 'abc');
  await page.press(selector, 'ArrowLeft');
  await page.keyboard.type('X');
  await page.press(selector, 'ArrowRight');
  await page.keyboard.type('Y');
  await expect(page.locator(selector)).toHaveValue('abXcY');
  expect(await page.evaluate(() => window.__left)).toBe(false);
  expect(page.url()).toBe(url);
}

// Opens the first of two attached patches and returns its url.
async function openFirstPatch(page, unique) {
  await createIssueWithTwoPatches(page, unique);
  await page.getByRole('link', { name: `${unique}-one.diff` }).first().click();
  await page.waitForLoadState('networkidle');
  await expect(page.locator(NEXT_LINK).first()).toBeVisible();
  return page.url();
}

test('keeps the arrow keys in the review subject field on a repository file with siblings', async ({ page }) => {
  const unique = uniqueName();
  commitFile(`auto/${unique}/one.rb`, 'puts 1\n', `arrow one ${unique}`);
  // Both files must exist at the opened revision for Redmine to render the sibling links.
  const revision = commitFile(`auto/${unique}/two.rb`, 'puts 2\n', `arrow two ${unique}`);
  await login(page);
  await fetchChangesets(page, seed.project);

  const entryUrl = `/projects/${seed.project}/repository/${seed.repository}/entry/auto/${unique}/one.rb?rev=${revision}`;
  await openReviewForm(page, entryUrl);
  await expect(page.locator(NEXT_LINK).first()).toBeVisible();
  await typeWithArrowKeys(page, '#review_subject', page.url());
});

test('keeps the arrow keys in the comment textarea of the add dialog on an attachment with siblings', async ({ page }) => {
  await login(page);
  const url = await openFirstPatch(page, uniqueName());

  await openReviewForm(page, url);
  await typeWithArrowKeys(page, '#review_comment', url);
});

test('keeps the arrow keys in the reply field of an existing review', async ({ page }) => {
  const unique = uniqueName();
  await login(page);
  const url = await openFirstPatch(page, unique);

  const { id } = await createReview(page, `arrow review ${unique}`, url);
  await openReview(page, id);
  await page.locator(`#show_review_${id}`).getByRole('link', { name: 'Reply' }).click();
  await expect(page.locator(`#reply_comment_${id}`)).toBeVisible();
  await typeWithArrowKeys(page, `#reply_comment_${id}`, url);
});

test('keeps the arrow keys in the subject and comment fields of the edit form', async ({ page }) => {
  const unique = uniqueName();
  await login(page);
  const url = await openFirstPatch(page, unique);

  const { id } = await createReview(page, `arrow edit ${unique}`, url);
  await openReview(page, id);
  await page.locator(`#show_review_${id}`).getByRole('link', { name: 'Update' }).click();
  await expect(page.locator(`#update-form-${id}`)).toBeVisible();
  await typeWithArrowKeys(page, `#review_form_${id} #review_subject`, url);
  await typeWithArrowKeys(page, `#review_comment_${id}`, url);
});

test('still moves to the next attachment with the arrow key when no dialog is open', async ({ page }) => {
  const unique = uniqueName();
  await login(page);
  const url = await openFirstPatch(page, unique);

  await page.keyboard.press('ArrowRight');
  await expect(page).not.toHaveURL(url);
  await expect(page.locator('#content')).toContainText(`${unique}-two.diff`);
});

test('moves to the previous attachment again after the review dialog was closed', async ({ page }) => {
  const unique = uniqueName();
  await login(page);
  await openFirstPatch(page, unique);
  await page.locator(NEXT_LINK).first().click();
  await page.waitForLoadState('networkidle');
  const secondUrl = page.url();

  await openReviewForm(page, secondUrl);
  await page.locator('.ui-dialog:has(#review-form-frame) .ui-dialog-titlebar-close').click();
  await expect(page.locator('#review_subject')).toBeHidden();
  // Closing leaves focus in the hidden dialog's field; take it away from there.
  await page.evaluate(() => document.activeElement.blur());

  await page.keyboard.press('ArrowLeft');
  await expect(page).not.toHaveURL(secondUrl);
  await expect(page.locator('#content')).toContainText(`${unique}-one.diff`);
});
