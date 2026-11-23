import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadClassicScripts, flushReady } from './support/load_classic_script.js';

describe('review form', () => {
  beforeEach(async () => {
    // #content must exist before the script loads: the keydown guard is
    // delegated on it inside a ready handler.
    document.body.innerHTML = '<div id="content"></div>';
    loadClassicScripts();
    await flushReady();
  });

  describe('$.fn.serialize2json', () => {
    it('collects same-name fields into an array and keeps empty values', () => {
      document.body.innerHTML = `
        <form id="review_form">
          <input name="review[subject]" value="Fix bug">
          <input name="issue[assigned_to_id]" value="">
          <input name="auto_assign[assignable_list][]" value="1">
          <input name="auto_assign[assignable_list][]" value="3">
        </form>`;

      const data = $('#review_form').serialize2json();

      expect(data['review[subject]']).toBe('Fix bug');
      expect(data['issue[assigned_to_id]']).toBe('');
      expect(data['auto_assign[assignable_list][]']).toEqual(['1', '3']);
    });
  });

  describe('$.fn.down', () => {
    it('returns the first element child, skipping text nodes', () => {
      document.body.innerHTML = '<div id="wrapper">text<span id="first_child"></span></div>';

      expect($('#wrapper').down().attr('id')).toBe('first_child');
    });

    it('returns an empty set when there is no element child', () => {
      document.body.innerHTML = '<div id="wrapper"></div>';

      expect($('#wrapper').down().length).toBe(0);
    });

    it('does not override an existing definition', () => {
      $.fn.down = function () {
        return 'custom down';
      };

      loadClassicScripts(['assets/javascripts/code_review.js']);

      expect($('#content').down()).toBe('custom down');
    });
  });

  describe('make_addreview_link', () => {
    it('appends the link to the tab list', () => {
      document.body.innerHTML = `
        <div class="tabs">
          <ul>
            <li><a href="/projects/demo/repository" id="tab-entry">Repository</a></li>
          </ul>
        </div>`;

      make_addreview_link(null, '<li><a href="/projects/demo/code_review">Code review</a></li>');

      expect($('div.tabs ul li').length).toBe(2);
      expect($('div.tabs ul').html()).toContain('Code review');
    });

    it('documents a crash (not intended behavior): throws when there is no entry tab', () => {
      document.body.innerHTML = '<div></div>';

      expect(() => make_addreview_link(null, '<li>x</li>')).toThrow(TypeError);
    });
  });

  describe('arrow keys in dialog inputs', () => {
    beforeEach(() => {
      $('#content').append('<div class="ui-dialog"><input id="comment"></div>');
    });

    it('stops ← / → from reaching document handlers', () => {
      const fired = vi.fn();
      $(document).on('keydown', fired);

      $('#comment').trigger($.Event('keydown', { key: 'ArrowLeft' }));
      $('#comment').trigger($.Event('keydown', { key: 'ArrowRight' }));

      expect(fired).not.toHaveBeenCalled();
    });

    it('lets other keys propagate', () => {
      const fired = vi.fn();
      $(document).on('keydown', fired);

      $('#comment').trigger($.Event('keydown', { key: 'ArrowUp' }));

      expect(fired).toHaveBeenCalled();
    });
  });

  describe('change_option', () => {
    it('loads the list into #content with the show_closed flag', () => {
      const load = vi.spyOn($.fn, 'load');

      change_option('/projects/demo/code_review', true);

      expect(load).toHaveBeenCalledWith('/projects/demo/code_review', { show_closed: true }, expect.any(Function));
      expect(load.mock.instances[0].attr('id')).toBe('content');
    });
  });

  describe('bindReviewFormTrackerChange', () => {
    beforeEach(async () => {
      document.body.innerHTML = `
        <div id="content">
          <div id="review-form"></div>
          <form id="review_form">
            <select id="issue_tracker_id" name="issue[tracker_id]">
              <option value="1">Bug</option>
              <option value="2">Feature</option>
            </select>
            <input name="review[subject]" value="Fix bug">
          </form>
        </div>`;
      loadClassicScripts();
      await flushReady();
    });

    it('reloads the form with the tracker on change', async () => {
      const load = vi.spyOn($.fn, 'load');

      bindReviewFormTrackerChange('/projects/demo/code_review/new');
      await flushReady();
      $('#issue_tracker_id').val('2');
      $('#issue_tracker_id').trigger('change');

      expect(load).toHaveBeenCalledTimes(1);
      expect(load).toHaveBeenCalledWith(
        '/projects/demo/code_review/new?issue%5Btracker_id%5D=2&review%5Bsubject%5D=Fix%20bug',
        undefined,
        expect.any(Function)
      );
      expect(load.mock.instances[0].attr('id')).toBe('review-form');
    });

    it('binds nothing when the tracker select is missing', async () => {
      document.body.innerHTML = '<div id="review-form"></div>';
      const load = vi.spyOn($.fn, 'load');

      expect(() => bindReviewFormTrackerChange('/projects/demo/code_review/new'))
        .not.toThrow();
      await flushReady();

      expect(load).not.toHaveBeenCalled();
    });
  });

  describe('delete review link', () => {
    beforeEach(() => {
      document.body.innerHTML = '<div id="delete-review-link"></div>';
    });

    it('reloads the page once when the delete succeeds, however many times the partial rendered', () => {
      // jsdom cannot navigate and its location.reload cannot be spied on,
      // so the global is replaced with a stub.
      const reload = vi.fn();
      vi.stubGlobal('location', { reload: reload });

      $('#delete-review-link').trigger('ajax:success');

      expect(reload).toHaveBeenCalledTimes(1);
    });

    it('does not reload and shows the HTTP status when the delete fails', () => {
      const reload = vi.fn();
      const alertSpy = vi.fn();
      vi.stubGlobal('location', { reload: reload });
      vi.stubGlobal('alert', alertSpy);

      $('#delete-review-link').trigger($.Event('ajax:error', {
        detail: [null, 'error', { status: 403, statusText: 'Forbidden' }]
      }));

      expect(reload).not.toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith('403 Forbidden');
    });

    it('does nothing for other elements', () => {
      const reload = vi.fn();
      vi.stubGlobal('location', { reload: reload });

      $('#content').trigger('ajax:success');

      expect(reload).not.toHaveBeenCalled();
    });
  });

  describe('loadWithErrorDisplay', () => {
    const failWith = (status, statusText) =>
      vi.spyOn($.fn, 'load').mockImplementation(function (url, params, callback) {
        callback.call(this[0], '', 'error', { status: status, statusText: statusText });
        return this;
      });

    beforeEach(() => {
      document.body.innerHTML = '<div id="target"><p>old</p></div>';
    });

    it('shows the HTTP status above the existing content when the request fails', () => {
      failWith(500, 'Internal Server Error');

      loadWithErrorDisplay($('#target'), '/x');

      expect($('#target > .flash.error').text()).toBe('500 Internal Server Error');
      expect($('#target > p').text()).toBe('old');
    });

    it('replaces the previous error instead of stacking them', () => {
      failWith(404, 'Not Found');

      loadWithErrorDisplay($('#target'), '/x');
      loadWithErrorDisplay($('#target'), '/x');

      expect($('#target > .flash.error').length).toBe(1);
    });

    it('shows nothing when the request succeeds', () => {
      vi.spyOn($.fn, 'load').mockImplementation(function (url, params, callback) {
        callback.call(this[0], 'ok', 'success', {});
        return this;
      });

      loadWithErrorDisplay($('#target'), '/x');

      expect($('#target .flash').length).toBe(0);
    });
  });
});
