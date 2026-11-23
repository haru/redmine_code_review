import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadClassicScripts, flushReady } from './support/load_classic_script.js';

describe('repository view', () => {
  beforeEach(async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('<p>loaded</p>'))));
    document.body.innerHTML = '<meta name="csrf-token" content="T"><div id="content"></div>';
    loadClassicScripts();
    await flushReady();
  });

  // Renders `html` followed by a marker carrying `attrs` and initializes the page.
  const render = (html, name, attrs) => {
    const marker = document.createElement('div');
    marker.setAttribute('data-cr-init', name);
    for (const [key, value] of Object.entries(attrs)) {
      marker.setAttribute(`data-cr-${key}`, value);
    }
    document.getElementById('content').innerHTML = html;
    document.getElementById('content').append(marker);
    crInitialize(document);
  };

  describe('revisions-view', () => {
    const table = `
      <table class="changesets">
        <thead><tr><th>revision</th></tr><tr><th>second head row</th></tr></thead>
        <tbody>
          <tr class="changeset"><td class="id"><a href="/projects/demo/repository/revisions/123">123</a></td></tr>
          <tr class="changeset"><td class="id"><a href="/projects/demo/repository/revisions/456">456</a></td></tr>
        </tbody>
      </table>`;
    const counts = JSON.stringify({
      123: { total: 3, open: 2, progress: '<span class="p">2 open</span>' },
      456: { total: 0, open: 0, progress: '<p>none</p>' },
    });

    it('adds the title column to the first header row and a progress cell to each revision row', () => {
      render(table, 'revisions-view', { 'column-title': 'Code <review>', 'review-counts': counts });

      const headRow = document.querySelector('table.changesets thead tr');
      expect(headRow.lastElementChild.textContent).toBe('Code <review>');
      expect(document.querySelectorAll('table.changesets thead th')).toHaveLength(3);
      const cells = document.querySelectorAll('tr.changeset td.progress');
      expect(cells).toHaveLength(2);
      expect(cells[0].querySelector('span.p').textContent).toBe('2 open');
      expect(cells[1].innerHTML).toBe('<p>none</p>');
    });

    it('throws naming the revision when the counts have no entry for it', () => {
      expect(() => render(table, 'revisions-view', {
        'column-title': 't', 'review-counts': JSON.stringify({ 123: { progress: 'x' } }),
      })).toThrowError(/revision 456/);
    });

    it('throws when the page has no changeset table', () => {
      expect(() => render('', 'revisions-view', { 'column-title': 't', 'review-counts': '{}' }))
        .toThrowError(/table\.changesets/);
    });
  });

  describe('revision-view', () => {
    const prefix = '/projects/demo/repository/revisions/1/entry';
    const attrs = (reviews) => ({ urlprefix: prefix, reviews: JSON.stringify(reviews) });
    const changes = `
      <div id="changes-legend"></div>
      <ul class="changes">
        <li class="change folder"><a href="${prefix}/src">src</a></li>
        <li class="change"><span class="icon icon-file">deleted.rb</span></li>
        <li class="change"><a href="${prefix}/src/added.rb">added.rb</a></li>
        <li class="change"><a href="${prefix}/src/edited.rb?rev_to=2">edited.rb</a></li>
        <li class="change"><a href="${prefix}/src/other.rb">other.rb</a></li>
      </ul>`;

    it('moves the assignments block right after the changes legend', () => {
      render(`${changes}<div id="code_review_assignments"></div>`, 'revision-view', attrs({}));

      expect(document.getElementById('changes-legend').nextElementSibling.id).toBe('code_review_assignments');
    });

    it('works without an assignments block (no assign permission)', () => {
      expect(() => render(changes, 'revision-view', attrs({}))).not.toThrow();
    });

    it('lists the reviews of each changed file, skipping folders and entries without links', () => {
      render(changes, 'revision-view', attrs({
        '/src/added.rb': [{ id: 7, link: '<a href="/code_review/7">#7</a>', closed: false }],
        '/src/edited.rb': [{ id: 8, link: '<a href="/code_review/8">#8</a>', closed: true }],
        '/src': [{ id: 9, link: '<a href="/code_review/9">#9</a>', closed: false }],
      }));

      const lis = document.querySelectorAll('li.change');
      expect(lis[0].querySelector('ul')).toBeNull();
      expect(lis[1].querySelector('ul')).toBeNull();
      const added = lis[2].querySelectorAll('ul li');
      expect(added).toHaveLength(1);
      expect(added[0].className).toBe('icon icon-review code_review_summary');
      expect(added[0].querySelector('a[href="/code_review/7"]')).not.toBeNull();
      const edited = lis[3].querySelectorAll('ul li');
      expect(edited[0].className).toBe('icon icon-closed-review code_review_summary');
      expect(edited[0].querySelector('a[href="/code_review/8"]')).not.toBeNull();
      expect(lis[4].querySelector('ul')).toBeNull();
    });

    it('appends an empty list for a file whose review list is empty', () => {
      render(changes, 'revision-view', attrs({ '/src/other.rb': [] }));

      const list = document.querySelectorAll('li.change')[4].querySelector('ul');
      expect(list).not.toBeNull();
      expect(list.children).toHaveLength(0);
    });
  });

  describe('entry-link', () => {
    const tabs = '<div class="tabs"><ul><li><a id="tab-entry" href="#">Entry</a></li></ul></div>';
    const link = '<a class="icon icon-edit" href="/code_review/forward">Add review</a>';

    it('appends the link to the tab list without recreating the existing tabs', () => {
      render(tabs, 'entry-link', { link });
      const tab = document.getElementById('tab-entry');

      expect(document.querySelector('div.tabs ul').lastElementChild).toBe(
        document.querySelector('div.tabs ul a.icon-edit'));
      expect(document.getElementById('tab-entry')).toBe(tab);
    });

    it('throws a clear error when the entry tab is missing', () => {
      expect(() => render('', 'entry-link', { link }))
        .toThrowError('code_review: entry tab (#tab-entry) not found');
    });

    it('keeps a quote in the link HTML intact', () => {
      render(tabs, 'entry-link', { link: `<a href="/x" title="it's">it's</a>` });

      expect(document.querySelector('div.tabs ul a[title="it\'s"]').textContent).toBe("it's");
    });
  });

  describe('toggle-closed', () => {
    const checkbox = (checked) => `<input type="checkbox" id="show_closed" ${checked ? 'checked' : ''}
      data-cr-action="toggle-closed" data-cr-url="/projects/demo/code_review">`;

    it.each([[true, 'show_closed=true'], [false, 'show_closed=false']])(
      'reloads #content with POST and %s', async (checked, body) => {
        document.getElementById('content').innerHTML = checkbox(checked);

        document.getElementById('show_closed').dispatchEvent(new Event('change', { bubbles: true }));
        await flushReady();

        const [url, init] = fetch.mock.calls[0];
        expect(url).toBe('/projects/demo/code_review');
        expect(init.method).toBe('POST');
        expect(init.body).toBe(body);
        expect(document.getElementById('content').textContent).toBe('loaded');
      });

    it('keeps the page and shows the status when the request fails', async () => {
      fetch.mockResolvedValue(new Response('', { status: 500, statusText: 'Server Error' }));
      document.getElementById('content').innerHTML = checkbox(true);

      document.getElementById('show_closed').dispatchEvent(new Event('change', { bubbles: true }));
      await flushReady();

      expect(document.getElementById('show_closed')).not.toBeNull();
      expect(document.querySelector('#content .cr-load-error').textContent).toBe('500 Server Error');
    });
  });
});
