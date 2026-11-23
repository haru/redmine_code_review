// Builds the `diff-view` marker the server renders (see docs/inline-javascript-in-views.md),
// so each test only states the attributes it cares about.
const DEFAULTS = {
  'add-review-url': '/code_review/new',
  'show-review-url': '/code_review/show',
  'add-image': '<img src="/images/edit.png">',
  'show-image': '<img src="/images/review.png">',
  'show-closed-image': '<img src="/images/closed_review.png">',
  'add-form-title': 'Add review',
  'review-dialog-title': 'Code review',
  'repository-id': 'repo1',
  'action-type': 'entry',
  'rev': '1',
  'rev-to': '',
  'path': '/src/added.rb',
  'change-id': '5',
  'attachment-id': '',
  'readonly': 'false',
  'diff': 'false',
  'reviews': '[]',
};

const escapeAttr = (value) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

export const diffMarker = (overrides = {}) => {
  const attrs = { ...DEFAULTS, ...overrides };
  const html = Object.entries(attrs)
    .filter(([, value]) => value !== null)
    .map(([name, value]) => `data-cr-${name}="${escapeAttr(value)}"`)
    .join(' ');
  return `<div data-cr-init="diff-view" ${html}></div>`;
};

export const fileTable = (rows = [1, 2], filename = 'added.rb') => `
  <table class="filecontent">
    <thead><tr><th class="filename">${filename}</th></tr></thead>
    <tbody>${rows.map((n) => `<tr><th data-txt="${n}"></th><td>line ${n}</td></tr>`).join('')}</tbody>
  </table>`;

export const pageWith = (marker, tables = fileTable()) => `
  <meta name="csrf-token" content="TOKEN">
  <div id="content">
    <div id="code_review">
      ${tables}
      <div id="review-form-frame"><div id="review-form"></div></div>
      <div id="code-review-assign-link"></div>
      ${marker}
    </div>
  </div>`;
