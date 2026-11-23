const { test, expect } = require('../support/fixtures');
const { seed, fileDiffUrl, login, createReview, openReview, resetCodeReviewSettings } = require('../support/helpers');

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

// Logs out (drops the session cookie) and logs in as `who`.
async function switchUser(page, who) {
  await page.context().clearCookies();
  await login(page, who);
}

test('a view-only member gets no reply, edit or delete controls in the review popup', async ({ page }) => {
  await login(page);
  const { id } = await createReview(page, 'E2E permission popup');
  await switchUser(page, 'viewer');

  await page.goto(fileDiffUrl());
  await page.waitForLoadState('networkidle');
  await openReview(page, id);
  const popup = page.locator(`#show_review_${id}`);
  await expect(popup).toContainText('E2E permission popup');
  await expect(popup.getByRole('link', { name: 'Reply' })).toHaveCount(0);
  await expect(popup.getByRole('link', { name: 'Update' })).toHaveCount(0);
  await expect(popup.getByRole('link', { name: 'Delete' })).toHaveCount(0);
  await expect(page.locator(`#reply_${id}`)).toHaveCount(0);
  // The edit box is rendered but stays hidden: no control reveals it.
  await expect(page.locator(`#update-form-${id}`)).toBeHidden();
});

test('a view-only member is refused direct reply, update, destroy, assign and settings requests', async ({ page }) => {
  await login(page);
  await resetCodeReviewSettings(page);
  const { id } = await createReview(page, 'E2E permission direct');
  await switchUser(page, 'viewer');

  const forged = async (project, action, form) => {
    const response = await page.request.post(`/projects/${project}/${action}`, { form, maxRedirects: 0 });
    expect(response.status(), `${action} as a view-only member`).toBe(403);
  };
  await forged(seed.project, 'code_review/reply', { review_id: id, 'reply[comment]': 'forged reply', 'issue[lock_version]': '0' });
  await forged(seed.project, 'code_review/update', { review_id: id, 'review[subject]': 'forged subject', 'issue[lock_version]': '0' });
  await forged(seed.project, 'code_review/destroy', { review_id: id });
  await forged(seed.project, 'code_review/assign', { rev: seed.revision, changeset_id: '1' });
  await forged(seed.settingsProject, 'code_review_settings/update', {
    'setting[tracker_in_review_dialog]': '1', 'setting[hide_code_review_tab]': '1',
  });

  // The review is unchanged and still visible to the view-only member.
  await page.goto(fileDiffUrl());
  await page.waitForLoadState('networkidle');
  await openReview(page, id);
  const popup = page.locator(`#show_review_${id}`);
  await expect(popup).toContainText('E2E permission direct');
  await expect(popup).not.toContainText('forged');

  // The settings are unchanged.
  await switchUser(page, 'user');
  await page.goto(`/projects/${seed.settingsProject}/settings/code_review`);
  await expect(page.locator('#setting_tracker_in_review_dialog')).not.toBeChecked();
  await expect(page.locator('#setting_hide_code_review_tab')).not.toBeChecked();
});

test('an anonymous visitor is sent to the login page for a private project', async ({ page }) => {
  await page.goto(`/projects/${seed.privateProject}/code_review/index`);
  await expect(page).toHaveURL(/\/login\?back_url=/);
  await expect(page.locator('#login-form')).toBeVisible();
});

test('a signed-in non-member is forbidden from a private project', async ({ page }) => {
  await login(page, 'outsider');
  const response = await page.goto(`/projects/${seed.privateProject}/code_review/index`);
  expect(response.status()).toBe(403);
});

test('a view-only member cannot open the project settings that hold the code review tab', async ({ page }) => {
  await login(page, 'viewer');
  const response = await page.goto(`/projects/${seed.settingsProject}/settings/code_review`);
  expect(response.status()).toBe(403);

  await switchUser(page, 'user');
  await page.goto(`/projects/${seed.settingsProject}/settings/code_review`);
  await expect(page.locator('#tab-code_review')).toBeVisible();
});
