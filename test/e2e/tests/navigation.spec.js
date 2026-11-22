const { test, expect } = require('../support/fixtures');
const { seed, login, createReview, openReview } = require('../support/helpers');

// Creates a review and returns { id, issueId } read from its popup heading.
async function createReviewWithIssue(page, subject) {
  const { id } = await createReview(page, subject);
  await openReview(page, id);
  const href = await page.locator(`#show_review_${id} h2 a`).first().getAttribute('href');
  return { id, issueId: href.match(/\/issues\/(\d+)/)[1] };
}

test('links the issue page of a review to its diff, where the review popup opens', async ({ page }) => {
  const subject = 'E2E navigation issue link';
  await login(page);
  const { id, issueId } = await createReviewWithIssue(page, subject);

  await page.goto(`/issues/${issueId}`);
  const link = page.locator('div.issue.details').getByRole('link', { name: new RegExp(`${seed.path}.*line`) });
  await expect(link).toBeVisible();
  await link.click();

  await expect(page).toHaveURL(new RegExp(`review_id=${id}`));
  await expect(page.locator(`#show_review_${id}`)).toContainText(subject);
});

test('sorts the review index by subject and by id', async ({ page }) => {
  const unique = Date.now();
  const first = `E2E sort ${unique} alpha`;
  const second = `E2E sort ${unique} omega`;
  await login(page);
  await createReview(page, first);
  await createReview(page, second);

  // Positions of the two reviews among the rows listed on the page.
  const order = async (selector) => {
    const texts = await page.locator(`#code_review_list ${selector}`).allTextContents();
    return [texts.findIndex((t) => t.includes(first)), texts.findIndex((t) => t.includes(second))];
  };
  const sortBy = async (caption) => {
    await Promise.all([
      page.waitForURL(/sort=/),
      page.locator('#code_review_list thead').getByRole('link', { name: caption, exact: true }).click(),
    ]);
  };

  await page.goto(`/projects/${seed.project}/code_review/index`);
  await sortBy('Subject');
  let [i, j] = await order('td.subject');
  expect(i).toBeGreaterThanOrEqual(0);
  expect(i).toBeLessThan(j);
  await sortBy('Subject');
  [i, j] = await order('td.subject');
  expect(j).toBeGreaterThanOrEqual(0);
  expect(i).toBeGreaterThan(j);

  await sortBy('#');
  const ids = await page.locator('#code_review_list tbody td:first-child').allTextContents();
  const issueIds = ids.map((t) => Number(t.trim()));
  expect(issueIds).toEqual([...issueIds].sort((x, y) => x - y));
});

test('sorts the review index by path and by reviewer without a server error', async ({ page }) => {
  await login(page);
  await createReview(page, 'E2E navigation path sort');
  await page.goto(`/projects/${seed.project}/code_review/index`);
  for (const caption of ['Path', 'Reviewer']) {
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.request().isNavigationRequest() && new URL(r.url()).search.includes('sort=')),
      page.locator('#code_review_list thead').getByRole('link', { name: caption, exact: true }).click(),
    ]);
    expect(response.status(), `sorting by ${caption}`).toBe(200);
    await expect(page.locator('#code_review_list tbody tr').first()).toBeVisible();
  }
});

test('moves from a file view without a revision to the revision that last changed it', async ({ page }) => {
  await login(page);
  await page.goto(`/projects/${seed.project}/repository/${seed.repository}/entry/${seed.path}`);
  await page.getByRole('link', { name: 'Add review' }).click();
  await expect(page).toHaveURL(new RegExp(`/entry/${seed.path}\\?rev=${seed.revision}$`));
});

test('expands the review macro in an issue description into a link to the review', async ({ page }) => {
  await login(page);
  const { id } = await createReviewWithIssue(page, 'E2E navigation macro');

  await page.goto(`/projects/${seed.project}/issues/new`);
  await page.fill('#issue_subject', 'E2E macro issue');
  await page.fill('#issue_description', `see {{review(${id})}}`);
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page).toHaveURL(/\/issues\/\d+$/);

  const link = page.locator('div.issue.details .description').getByRole('link', { name: `Review#${id}` });
  await expect(link).toHaveAttribute('href', new RegExp(`/code_review/show\\?review_id=${id}`));
});
