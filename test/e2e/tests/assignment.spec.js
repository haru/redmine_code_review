const { test, expect } = require('../support/fixtures');
const { seed, login } = require('../support/helpers');

// The first seeded commit: no spec creates a review on it, so its revisions-list status
// shows assignments (reviews take precedence over assignments there).
const revision = seed.parentSuggestion.revision;
const revisionUrl = `/projects/${seed.project}/repository/${seed.repository}/revisions/${revision}`;
const revisionsUrl = `/projects/${seed.project}/repository/${seed.repository}/revisions`;

// Opens the revision page and follows its review-assignment "Add" link to the pre-filled
// new-issue form.
async function openAssignmentForm(page) {
  await page.goto(revisionUrl);
  await page.locator('#code_review_assignments a.icon-add').click();
  await expect(page.locator('#issue_subject')).toBeVisible();
}

// Saves the pre-filled issue with a unique subject and the reviewer as assignee.
// Returns { id, subject } of the created assignment issue.
async function createAssignment(page, label) {
  const subject = `E2E assignment ${label}`;
  await openAssignmentForm(page);
  await page.fill('#issue_subject', subject);
  await page.locator('#issue_assigned_to_id').selectOption({ label: `E2E ${seed.user.login}` });
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page).toHaveURL(/\/issues\/\d+$/);
  const id = new URL(page.url()).pathname.split('/').pop();
  await expect(page.locator('div.subject h3')).toHaveText(subject);
  return { id, subject };
}

test('opens a new issue form pre-filled with the revision from the revision page', async ({ page }) => {
  await login(page);
  await page.goto(revisionUrl);
  const block = page.locator('#code_review_assignments');
  await expect(block).toContainText('Review assignments');

  await block.locator('a.icon-add').click();
  await expect(page).toHaveURL(/\/issues\/new/);
  await expect(page.locator('#issue_subject')).toHaveValue(/^Review request \[.*Add hello\.rb\]$/);
  await expect(page.locator('#issue_subject')).toHaveValue(new RegExp(revision.slice(0, 8)));
});

test('shows the reviewed revision on the issue page after saving an assignment', async ({ page }) => {
  await login(page);
  const { id } = await createAssignment(page, 'issue page');

  await page.goto(`/issues/${id}`);
  // Redmine 7 renders the hook output outside a table, so the plugin's <tr> markup is
  // dropped by the browser; assert on the label and the revision link instead.
  const issue = page.locator('div.issue.details');
  await expect(issue).toContainText('Review assigned for');
  await expect(issue.locator(`a[href$="/revisions/${revision}"]`)).toBeVisible();
});

test('marks the revision as assigned on the revision page and the revisions list', async ({ page }) => {
  await login(page);
  const { id } = await createAssignment(page, 'revision views');

  await page.goto(revisionUrl);
  await expect(page.locator('#code_review_assignments').getByRole('link', { name: `#${id}` })).toBeVisible();

  // The revisions list only shows the state of the whole revision, so this cell cannot
  // tell which assignment produced it; the link to #id above is the check tied to this test.
  await page.goto(revisionsUrl);
  const row = page.locator('tr.changeset', { has: page.locator(`td.id a[href$="/revisions/${revision}"]`) });
  await expect(row.locator('td.progress')).toContainText('Assigned');
});
