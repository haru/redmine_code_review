import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadClassicScripts, flushReady } from './support/load_classic_script.js';

describe('review popup actions', () => {
  beforeEach(async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('<p>result</p>'))));
    document.body.innerHTML = '<meta name="csrf-token" content="T"><div id="content"></div>';
    loadClassicScripts();
    await flushReady();
  });

  const render = (html) => {
    document.getElementById('content').innerHTML = html;
  };

  const click = (id) => document.getElementById(id).click();

  describe('display', () => {
    beforeEach(() => {
      render(`<a href="#" id="go" data-cr-action="display" data-cr-show="#form" data-cr-hide="#link"></a>
        <p id="form" style="display:none"></p><p id="link"></p>
        <a href="#" id="only-show" data-cr-action="display" data-cr-show="#form"></a>
        <a href="#" id="only-hide" data-cr-action="display" data-cr-hide="#link"></a>`);
    });

    it('shows and hides the named elements', () => {
      click('go');

      expect(document.getElementById('form').style.display).toBe('');
      expect(document.getElementById('link').style.display).toBe('none');
    });

    it.each([['only-show', 'link', ''], ['only-hide', 'form', 'none']])(
      '%s leaves the other element alone', (id, other, display) => {
        click(id);

        expect(document.getElementById(other).style.display).toBe(display);
      }
    );

    it('throws when a selector matches nothing', () => {
      render('<a href="#" id="bad" data-cr-action="display" data-cr-show="#nope"></a>');

      expect(() => crActionDisplay(document.getElementById('bad'))).toThrow('#nope');
    });
  });

  describe('toggle', () => {
    beforeEach(() => {
      render(`<a href="#" id="reply" data-cr-action="toggle" data-cr-target="#box" data-cr-focus="#text"></a>
        <div id="box" style="display:none"><textarea id="text"></textarea></div>`);
    });

    it('shows the target and focuses the field, then hides it again', () => {
      click('reply');

      expect(document.getElementById('box').style.display).toBe('');
      expect(document.activeElement.id).toBe('text');

      click('reply');

      expect(document.getElementById('box').style.display).toBe('none');
    });

    it('needs no focus attribute', () => {
      document.getElementById('reply').removeAttribute('data-cr-focus');

      click('reply');

      expect(document.getElementById('box').style.display).toBe('');
    });
  });

  describe('forms', () => {
    beforeEach(() => {
      render(`<div id="review-form"><form id="review_form">
          <input name="subject" value="a b"><select id="issue_tracker_id" name="tracker" data-cr-action="reload-review-form" data-cr-url="/new"><option value="2">t</option></select>
          <input name="parent" id="parent"><button type="button" id="yes" data-cr-action="set-value" data-cr-target="#parent" data-cr-value="42"></button>
          <button type="button" id="apply" data-cr-action="submit-review-form" data-cr-url="/create"></button>
        </form></div>
        <div id="show_review_3"><form id="message-form-3"><input name="reply" value="hi"></form>
          <button type="button" id="reply-apply" data-cr-action="apply-popup-form" data-cr-url="/reply" data-cr-form="message-form-3" data-cr-review-id="3"></button></div>`);
    });

    it('submits the review form with POST into #review-form', async () => {
      click('apply');
      await flushReady();

      const [url, init] = fetch.mock.calls[0];
      expect(url).toBe('/create');
      expect(init.method).toBe('POST');
      expect(init.body).toBe('subject=a+b&tracker=2&parent=');
      expect(document.getElementById('review-form').textContent).toBe('result');
    });

    it('reloads the review form with GET keeping the typed values on tracker change', async () => {
      const select = document.getElementById('issue_tracker_id');

      select.dispatchEvent(new Event('change', { bubbles: true }));
      await flushReady();

      expect(fetch.mock.calls[0][0]).toBe('/new?subject=a+b&tracker=2&parent=');
      expect(fetch.mock.calls[0][1].method).toBe('GET');
    });

    it('keeps repeated field names (multi-select) as repeated parameters', async () => {
      document.getElementById('show_review_3').insertAdjacentHTML('beforeend',
        `<form id="multi-form"><select name="cf[]" multiple>
          <option value="a" selected></option><option value="b" selected></option></select></form>
        <button type="button" id="multi-apply" data-cr-action="apply-popup-form" data-cr-url="/multi" data-cr-form="multi-form" data-cr-review-id="3"></button>`);

      click('multi-apply');
      await flushReady();

      expect(fetch.mock.calls[0][0]).toBe('/multi?cf%5B%5D=a&cf%5B%5D=b');
    });

    it('applies a popup form with GET into #show_review_<id>', async () => {
      click('reply-apply');
      await flushReady();

      expect(fetch.mock.calls[0][0]).toBe('/reply?reply=hi');
      expect(document.getElementById('show_review_3').textContent).toBe('result');
    });

    it('sets the value of the target field', () => {
      click('yes');

      expect(document.getElementById('parent').value).toBe('42');
    });
  });

  describe('delete review link', () => {
    beforeEach(() => {
      render('<a id="delete-review-link"><span id="inner"></span></a><p id="other"></p>');
    });

    const emit = (id, type, detail) =>
      document.getElementById(id).dispatchEvent(new CustomEvent(type, { bubbles: true, detail }));

    it('reloads the page once when the delete succeeds, however many times the script ran', async () => {
      const reload = vi.fn();
      vi.stubGlobal('location', { reload });
      loadClassicScripts();
      await flushReady();

      emit('delete-review-link', 'ajax:success');

      expect(reload).toHaveBeenCalledTimes(1);
    });

    it('shows the HTTP status and does not reload when the delete fails', () => {
      const reload = vi.fn();
      const alertSpy = vi.fn();
      vi.stubGlobal('location', { reload });
      vi.stubGlobal('alert', alertSpy);

      emit('inner', 'ajax:error', [null, 'error', { status: 403, statusText: 'Forbidden' }]);

      expect(reload).not.toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith('403 Forbidden');
    });

    it('says so when the delete request got no answer (status 0)', () => {
      const alertSpy = vi.fn();
      vi.stubGlobal('alert', alertSpy);

      emit('inner', 'ajax:error', [null, 'error', { status: 0, statusText: '' }]);

      expect(alertSpy).toHaveBeenCalledWith('Network error');
    });

    it('ignores other elements', () => {
      const reload = vi.fn();
      vi.stubGlobal('location', { reload });

      emit('other', 'ajax:success');

      expect(reload).not.toHaveBeenCalled();
    });
  });

  describe('arrow keys in dialog fields', () => {
    beforeEach(() => {
      render('<div class="cr-dialog"><input id="in"><button id="btn"></button></div><input id="outside">');
    });

    const reaches = (id, key) => {
      const seen = vi.fn();
      document.addEventListener('keydown', seen, { once: true });
      document.getElementById(id).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      document.removeEventListener('keydown', seen);
      return seen.mock.calls.length > 0;
    };

    it.each(['ArrowLeft', 'ArrowRight'])('stops %s from reaching document handlers', (key) => {
      expect(reaches('in', key)).toBe(false);
    });

    it.each([['in', 'ArrowUp'], ['btn', 'ArrowLeft'], ['outside', 'ArrowLeft']])(
      'lets %s / %s propagate', (id, key) => {
        expect(reaches(id, key)).toBe(true);
      }
    );

    it('does not call preventDefault, so the caret still moves', () => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true });

      document.getElementById('in').dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
    });
  });
});
