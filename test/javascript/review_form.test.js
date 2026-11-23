import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadClassicScripts, flushReady } from './support/load_classic_script.js';
import { diffMarker, fileTable, pageWith } from './support/diff_fixture.js';

describe('review form', () => {
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

  const pressEscape = () =>
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

  const formFrame = () => document.getElementById('review-form-frame');

  describe('clickPencil', () => {
    it('loads the add form for the clicked line (GET) and opens the popup', async () => {
      render();

      document.getElementById('add_revew_img_2_0').click();
      await flushReady();

      expect(fetch.mock.calls[0][0]).toBe(
        '/code_review/new?change_id=5&action_type=entry&rev=1&rev_to=' +
        '&attachment_id=&repository_id=repo1&path=%2Fsrc%2Fadded.rb&line=2&file_count=0'
      );
      expect(fetch.mock.calls[0][1].method).toBe('GET');
      expect(document.querySelector('.cr-dialog #review-form').textContent).toBe('loaded');
      expect(document.querySelector('.cr-dialog-title').textContent).toBe('Add review');
    });

    it.each([
      ['spaces', 'my file.rb', 'my+file.rb'],
      ['a hash', 'a#b.rb', 'a%23b.rb'],
      ['Japanese', '日本語.rb', '%E6%97%A5%E6%9C%AC%E8%AA%9E.rb'],
    ])('encodes a file name with %s and marks a full diff', (_label, name, encoded) => {
      render({ path: '' }, fileTable([1], name));

      document.getElementById('add_revew_img_1_0').click();

      expect(fetch.mock.calls[0][0].endsWith(`&line=1&file_count=0&path=${encoded}&diff_all=true`)).toBe(true);
    });

    it('uses the file index of the clicked file as a number', () => {
      render({ path: '' }, fileTable([1], 'a.rb') + fileTable([1], 'b.rb'));

      document.getElementById('add_revew_img_1_1').click();

      expect(fetch.mock.calls[0][0]).toContain('&file_count=1&path=b.rb&diff_all=true');
    });

    it('throws when the diff has no file name for the clicked file', () => {
      render({ path: '' }, fileTable([1], 'a.rb'));
      crDiff.filenames = [];

      expect(() => clickPencil({ target: { id: 'add_revew_img_1_0' }, preventDefault() {} }))
        .toThrowError(/no file name for file 0/);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('prevents the default action of the click', () => {
      render();
      const event = new MouseEvent('click', { bubbles: true, cancelable: true });

      document.getElementById('add_revew_img_1_0').dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
    });
  });

  describe('the add form popup', () => {
    beforeEach(() => {
      render();
      document.getElementById('add_revew_img_1_0').click();
    });

    it.each([
      ['the × button', () => document.querySelector('.cr-dialog-close').click()],
      ['Esc', () => pressEscape()],
      ['hideForm', () => hideForm()],
      ['the cancel action', () => {
        document.body.insertAdjacentHTML('beforeend', '<a href="#" id="c" data-cr-action="cancel-review-form"></a>');
        document.getElementById('c').click();
      }],
    ])('is closed and emptied through %s', async (_label, close) => {
      await flushReady();

      close();

      expect(document.querySelector('.cr-dialog')).toBeNull();
      expect(formFrame().parentElement.id).toBe('code_review');
      expect(document.getElementById('review-form').innerHTML).toBe('');
    });

    it('can be opened again after it was closed', async () => {
      await flushReady();
      document.querySelector('.cr-dialog-close').click();

      document.getElementById('add_revew_img_1_0').click();
      await flushReady();

      expect(document.querySelectorAll('.cr-dialog')).toHaveLength(1);
      expect(document.querySelector('.cr-dialog #review-form').textContent).toBe('loaded');
    });
  });

  describe('load errors', () => {
    it('shows the HTTP status in the form when the request fails', async () => {
      fetch.mockResolvedValue(new Response('boom', { status: 500, statusText: 'Server Error' }));
      render();

      document.getElementById('add_revew_img_1_0').click();
      await flushReady();

      expect(document.querySelector('#review-form .cr-load-error').textContent).toBe('500 Server Error');
    });
  });

  describe('review-added', () => {
    it('closes the form and shows the icon of the new review', () => {
      render();
      document.getElementById('add_revew_img_1_0').click();
      document.body.insertAdjacentHTML('beforeend',
        '<div data-cr-init="review-added" data-cr-review-id="9" data-cr-line="1" data-cr-file-count="0"></div>');

      crInitialize(document);

      expect(document.querySelector('.cr-dialog')).toBeNull();
      expect(document.getElementById('review_9')).not.toBeNull();
    });
  });

  describe('review-added without a matching line', () => {
    it('throws and keeps the form open instead of hiding the new review', () => {
      render();
      document.getElementById('add_revew_img_1_0').click();
      document.body.insertAdjacentHTML('beforeend',
        '<div data-cr-init="review-added" data-cr-review-id="9" data-cr-line="99" data-cr-file-count="0"></div>');

      expect(() => crInitialize(document)).toThrowError(/no line 99 in file 0/);

      expect(document.querySelector('.cr-dialog')).not.toBeNull();
    });
  });

  describe('load marker', () => {
    it('loads the marker content with POST and the given params', async () => {
      document.body.innerHTML = `<meta name="csrf-token" content="T">
        <div id="code_review" data-cr-init="load" data-cr-url="/code_review/update_diff_view"
          data-cr-params='{"rev":"1","path":"a b"}'></div>`;

      crInitialize(document);
      await flushReady();

      const [url, init] = fetch.mock.calls[0];
      expect(url).toBe('/code_review/update_diff_view');
      expect(init.body).toBe('rev=1&path=a+b');
      expect(document.getElementById('code_review').textContent).toBe('loaded');
    });
  });
});
