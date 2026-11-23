import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadClassicScripts, flushReady } from './support/load_classic_script.js';
import { diffMarker, fileTable, pageWith } from './support/diff_fixture.js';

describe('diff view', () => {
  beforeEach(async () => {
    vi.stubGlobal('scrollTo', vi.fn());
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('<p>loaded</p>'))));
    document.body.innerHTML = '<div id="content"></div>';
    loadClassicScripts();
    await flushReady();
  });

  const render = (overrides = {}, tables = fileTable()) => {
    document.body.innerHTML = pageWith(diffMarker(overrides), tables);
    crInitialize(document);
  };

  describe('diff-view initialization', () => {
    it('builds the add-review URL from the data attributes', () => {
      render({ 'rev-to': '2' });

      expect(crDiff.addReviewUrl).toBe(
        '/code_review/new?change_id=5&action_type=entry&rev=1&rev_to=2' +
        '&attachment_id=&repository_id=repo1&path=%2Fsrc%2Fadded.rb'
      );
    });

    it('omits path from the URL when the path is empty', () => {
      render({ path: '' });

      expect(crDiff.addReviewUrl).not.toContain('path=');
    });

    it('collects the file names of the diff', () => {
      render({}, fileTable([1], 'a.rb') + fileTable([1], '  b.rb '));

      expect(crDiff.filenames).toEqual(['a.rb', 'b.rb']);
    });

    it('does nothing again when initialized a second time', () => {
      render();
      const first = crDiff;

      crInitialize(document);

      expect(crDiff).toBe(first);
    });

    it.each([
      ['readonly', 'yes'],
      ['diff', '1'],
    ])('throws naming the attribute when %s is not "true" or "false"', (name, value) => {
      expect(() => render({ [name]: value })).toThrow(`data-cr-${name}`);
    });

    it('throws naming the attribute when a required one is missing', () => {
      expect(() => render({ 'show-review-url': null })).toThrow('data-cr-show-review-url');
    });

    it('throws when the reviews are not valid JSON', () => {
      expect(() => render({ reviews: '[oops' })).toThrow('data-cr-reviews');
    });
  });

  describe('setAddReviewButton', () => {
    it('puts a pencil on each line number cell, with the legacy id', () => {
      render();

      expect(document.querySelectorAll('#review_span_1_0 img')).toHaveLength(1);
      expect(document.getElementById('add_revew_img_1_0')).not.toBeNull();
      expect(document.getElementById('add_revew_img_2_0')).not.toBeNull();
    });

    it('reads the line number from a link inside the cell', () => {
      render({}, `<table class="filecontent"><thead><tr><th class="filename">l.rb</th></tr></thead>
        <tbody><tr><th><a data-txt="4"></a></th><td>x</td></tr></tbody></table>`);

      expect(document.getElementById('add_revew_img_4_0')).not.toBeNull();
    });

    it('places no pencil when the view is readonly', () => {
      render({ readonly: 'true' });

      expect(document.getElementById('review_span_1_0')).not.toBeNull();
      expect(document.querySelectorAll('#review_span_1_0 img')).toHaveLength(0);
    });

    it('uses the second column for a diff', () => {
      render({ diff: 'true' }, `<table class="filecontent"><thead><tr><th class="filename">d.rb</th></tr></thead>
        <tbody><tr><th data-txt="1"></th><th data-txt="1"></th></tr></tbody></table>`);

      const cells = document.querySelectorAll('tbody th');
      expect(cells[0].querySelector('img')).toBeNull();
      expect(cells[1].querySelector('img').id).toBe('add_revew_img_1_0');
    });

    it('skips a number cell whose data-txt is empty', () => {
      render({}, `<table class="filecontent"><tbody>
        <tr><th data-txt=""></th></tr><tr><th data-txt="3"></th></tr></tbody></table>`);

      expect(document.querySelectorAll('table.filecontent img')).toHaveLength(1);
    });

    it('never parses the data-txt value as HTML', () => {
      const txt = '1"><img id="injected" src="x">';
      render({}, `<table class="filecontent"><tbody>
        <tr><th data-txt="${txt.replace(/"/g, '&quot;')}"></th></tr></tbody></table>`);

      expect(document.getElementById('injected')).toBeNull();
      expect(document.querySelector('table.filecontent span').id).toBe(`review_span_${txt}_0`);
    });

    it('skips rows without a number cell', () => {
      render({}, '<table class="filecontent"><tbody><tr><td>no th</td></tr></tbody></table>');

      expect(document.querySelectorAll('img')).toHaveLength(0);
    });
  });

  describe('setShowReviewButton', () => {
    const reviews = (list) => JSON.stringify(list);

    it('adds the review icon and an empty popup target for each review', () => {
      render({ reviews: reviews([{ id: 7, line: 1, file_count: 0, closed: false }]) });

      expect(document.querySelector('#review_7 img').getAttribute('src')).toBe('/images/review.png');
      expect(document.querySelector('#code_review > #show_review_7')).not.toBeNull();
    });

    it('uses the closed icon for a closed review', () => {
      render({ reviews: reviews([{ id: 7, line: 2, file_count: 0, closed: true }]) });

      expect(document.querySelector('#review_7 img').getAttribute('src')).toBe('/images/closed_review.png');
    });

    it('ignores a review whose line is not on the page', () => {
      render({ reviews: reviews([{ id: 7, line: 99, file_count: 0, closed: false }]) });

      expect(document.getElementById('review_7')).toBeNull();
    });

    it('loads and opens the review popup when the icon is clicked', async () => {
      render({ reviews: reviews([{ id: 7, line: 1, file_count: 0, closed: false }]) });

      document.querySelector('#review_7 img').click();
      await flushReady();

      const [url, init] = fetch.mock.calls[0];
      expect(url).toBe('/code_review/show');
      expect(init.method).toBe('POST');
      expect(init.body).toBe('review_id=7');
      expect(document.querySelector('.cr-dialog #show_review_7').textContent).toBe('loaded');
      expect(document.querySelector('.cr-dialog-title').textContent).toBe('Code review');
    });
  });

  describe('popupReview', () => {
    it('scrolls to the icon and opens the popup for the review of the marker', async () => {
      render({
        reviews: JSON.stringify([{ id: 7, line: 1, file_count: 0, closed: false }]),
        'popup-review-id': '7',
      });
      await flushReady();

      expect(window.scrollTo).toHaveBeenCalledTimes(1);
      expect(document.querySelector('.cr-dialog #show_review_7')).not.toBeNull();
    });

    it('throws naming the review when its icon is not on the page', () => {
      expect(() => render({
        reviews: JSON.stringify([]),
        'popup-review-id': '7',
      })).toThrowError(/review 7 has no icon/);
    });

    it('opens no popup without a popup-review-id', () => {
      render();

      expect(document.querySelector('.cr-dialog')).toBeNull();
    });
  });

  describe('moveAssignLinkAboveFileContent', () => {
    it('moves the assign link before the first file content table', () => {
      render();

      expect(document.querySelector('table.filecontent').previousElementSibling.id)
        .toBe('code-review-assign-link');
    });

    it('leaves the page alone when there is no file content table', () => {
      render({}, '');

      expect(document.getElementById('code-review-assign-link')).not.toBeNull();
    });
  });
});
