const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { expect } = require('./fixtures');
const { workDir } = require('./env');

const repoDir = path.join(workDir, 'repo');

// Seed data written by support/seed.rb. Required once per worker; a missing file or
// invalid JSON raises with the path, and missing keys raise below.
const seed = require(path.join(workDir, 'seed.json'));
for (const keys of [
  ['user', 'login'], ['user', 'password'], ['viewer', 'login'], ['viewer', 'password'],
  ['outsider', 'login'], ['outsider', 'password'],
  ['project'], ['repository'], ['revision'], ['path'],
  ['privateProject'], ['settingsProject'], ['settingsRepository'],
  ['patchAttachment', 'id'], ['patchAttachment', 'filename'], ['patchIssue'],
  ['parentSuggestion', 'revision'], ['parentSuggestion', 'parentIssue'],
]) {
  const value = keys.reduce((obj, key) => (obj == null ? undefined : obj[key]), seed);
  if (value === undefined || value === null || value === '') {
    throw new Error(`seed.json is missing key: ${keys.join('.')}`);
  }
}

// URLs of the seeded commit: the diff of one file, and the diff of the whole changeset.
// `query` is appended as is (e.g. 'type=sbs').
function fileDiffUrl(query = '') {
  return `/projects/${seed.project}/repository/${seed.repository}/diff/${seed.path}?rev=${seed.revision}&${query}`;
}

function changesetDiffUrl(query = '') {
  return `/projects/${seed.project}/repository/${seed.repository}/revisions/${seed.revision}/diff?${query}`;
}

// URL of the seeded patch attachment's diff view.
function attachmentUrl() {
  return `/attachments/${seed.patchAttachment.id}`;
}

// URL of the plugin's show action for one review.
function reviewShowUrl(id, project = seed.project) {
  return `/projects/${project}/code_review/show?review_id=${id}`;
}

// `who` is 'user' (reviewer with all review permissions), 'viewer' (view only) or
// 'outsider' (not a member of the project).
async function login(page, who = 'user') {
  const account = seed[who];
  await page.goto('/login');
  await page.fill('#username', account.login);
  await page.fill('#password', account.password);
  // A failed login re-renders the form with status 200; a successful one redirects.
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/login'),
    page.click('#login-submit'),
  ]);
  expect(response.status(), `login as ${account.login} failed`).toBe(302);
  // Redmine redirects to My page after a successful login.
  await expect(page.locator('#content h2')).toContainText('My page');
}

// Extracts the id of a freshly created review from the response of the create POST.
// Raises with the body if the server re-rendered the form instead (it answers 200 then).
function reviewIdFrom(body, subject) {
  const match = body.match(/data-cr-review-id="(\d+)"/);
  if (!match) {
    throw new Error(`review "${subject}" was not created; the server re-rendered the form:\n${body.slice(0, 500)}`);
  }
  return match[1];
}

// Opens a diff and the add-review dialog of its first pencil icon.
async function openReviewForm(page, diffUrl = fileDiffUrl()) {
  await page.goto(diffUrl);
  // The plugin's update_diff_view request redraws the icons of saved reviews after load;
  // clicking before it finishes loses the typed text.
  await page.waitForLoadState('networkidle');
  // The pencil icon id is spelled "add_revew_img_" in the plugin's JavaScript.
  await page.locator('img[id^="add_revew_img_"]').first().click();
  await expect(page.locator('#review_subject')).toBeVisible();
  await expect(page.locator('#review_subject')).toBeEditable();
}

// Clicks Apply and returns the response of the POST that saves the review.
async function applyReview(page) {
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname.endsWith('/code_review/new')),
    page.locator('#review-form').getByRole('button', { name: 'Apply' }).click(),
  ]);
  return response;
}

// Creates one review through the first pencil icon's dialog.
// Returns { id } after the new review's own icon has appeared; raises if the server
// re-rendered the form instead of creating the review.
async function createReview(page, subject, diffUrl = fileDiffUrl()) {
  await openReviewForm(page, diffUrl);
  await page.fill('#review_subject', subject);
  await expect(page.locator('#review_subject')).toHaveValue(subject);
  const body = await (await applyReview(page)).text();
  const id = reviewIdFrom(body, subject);
  await expect(page.locator(`#review_${id} img`)).toBeVisible();
  return { id };
}

// Opens the popup of review `id` by clicking its icon on the current diff page.
async function openReview(page, id) {
  await page.locator(`#review_${id} img`).click();
  await expect(page.locator(`#show_review_${id}`)).toBeVisible();
}

// Commits one file under auto/ to the shared test repository and returns the new revision.
// Restricting the path keeps src/hello.rb's history (and seed.json) unchanged.
function commitFile(relativePath, content, message) {
  if (!relativePath.startsWith('auto/')) {
    throw new Error(`commitFile only writes under auto/, got: ${relativePath}`);
  }
  const target = path.join(repoDir, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
  const git = (...args) => execFileSync('git', ['-C', repoDir, '-c', 'user.name=E2E', '-c', 'user.email=e2e@example.invalid', ...args], { encoding: 'utf8' });
  git('add', relativePath);
  git('commit', '--quiet', '-m', message);
  return git('rev-parse', 'HEAD').trim();
}

// Opens the repository page of `project`, which makes Redmine import new commits
// (autofetch_changesets), and waits for the page to load.
async function fetchChangesets(page, project) {
  const response = await page.goto(`/projects/${project}/repository`);
  expect(response.status(), `repository page of ${project}`).toBe(200);
  await page.waitForLoadState('networkidle');
}

// Posts the default code review settings to `project` (auto-assign off, no filters, first
// tracker, no auto relation, tab shown, no tracker choice in the dialog). The test
// environment disables CSRF protection, so no token is needed. Must be called logged in
// as a user with code_review_setting.
async function resetCodeReviewSettings(page, project = seed.settingsProject) {
  const trackerId = await firstTrackerId(page, project);
  const response = await page.request.post(`/projects/${project}/code_review_settings/update`, {
    form: {
      'setting[tracker_id]': trackerId,
      'setting[assignment_tracker_id]': trackerId,
      'setting[auto_relation]': '0',
      'setting[hide_code_review_tab]': '0',
      'setting[tracker_in_review_dialog]': '0',
      // Same shape as the real form with the auto-assign checkbox unchecked.
      'auto_assign[subject]': 'Code review request',
    },
    maxRedirects: 0,
  });
  expect(response.status(), `resetting settings of ${project}`).toBe(302);
}

// The id of the first tracker option on the project's settings form.
async function firstTrackerId(page, project) {
  const response = await page.request.get(`/projects/${project}/settings/code_review`);
  expect(response.status(), `settings page of ${project}`).toBe(200);
  const html = await response.text();
  const match = html.match(/<select[^>]*id="setting_tracker_id"[^>]*>\s*<option[^>]*value="(\d+)"/);
  if (!match) throw new Error(`could not read the tracker id from the settings of ${project}`);
  return match[1];
}

module.exports = {
  seed, fileDiffUrl, changesetDiffUrl, attachmentUrl, reviewShowUrl, login,
  openReviewForm, applyReview, createReview, openReview, reviewIdFrom, commitFile, fetchChangesets,
  resetCodeReviewSettings,
};
