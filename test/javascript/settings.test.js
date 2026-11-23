import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadClassicScripts, flushReady } from './support/load_classic_script.js';

const ADD_URL = '/projects/demo/code_review_settings/add_filter';
const EDIT_URL = '/projects/demo/code_review_settings/edit_filter';
const SORT_URL = '/projects/demo/code_review_settings/sort';

function settingsPage() {
  document.body.innerHTML = `
    <meta name="csrf-token" content="T">
    <div id="content">
      <form id="code_review_form">
        <input name="setting[tracker_id]" value="1">
        <select id="auto_assign_author_id" name="auto_assign[author_id]"></select>
        <input type="checkbox" name="auto_assign[assignable_list][]" value="1" checked>
        <input type="checkbox" name="auto_assign[assignable_list][]" value="3" checked>
        <input type="checkbox" id="auto_assign_enabled" data-cr-action="auto-assign-enabled">
        <div id="cr_auto_assign_settings" style="display: none;"></div>
        <input type="checkbox" id="auto_assign_filter_enabled" data-cr-action="auto-assign-filter-enabled">
        <div id="auto_assignment_filter_form" style="display: none;"></div>
        <div id="auto_assignment_filters">
          <p class="keep">old filters</p>
          <input type="text" id="auto_assign_add_filter_expression" name="auto_assign_add_filter[expression]" value="">
          <button type="button" id="add-apply" data-cr-action="add-filter" data-cr-url="${ADD_URL}"></button>
          <input type="text" id="auto_assign_edit_filter_0_expression" name="auto_assign_edit_filter[0][expression]" value="">
          <button type="button" id="edit-apply" data-cr-action="update-filter" data-cr-url="${EDIT_URL}" data-cr-num="0"></button>
          <a href="#" id="sort-lower" data-cr-action="sort-filter" data-cr-url="${SORT_URL}" data-cr-direction="lower" data-cr-num="2"></a>
          <table><tbody>
            <tr id="auto_assign_tr_0"><td><a href="#" id="delete-0" data-cr-action="remove" data-cr-target="#auto_assign_tr_0"></a></td></tr>
          </tbody></table>
        </div>
      </form>
    </div>`;
}

describe('settings screen', () => {
  beforeEach(async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('<p class="new">filters</p>'))));
    settingsPage();
    loadClassicScripts();
    await flushReady();
  });

  const byId = (id) => document.getElementById(id);
  const change = (id, checked) => {
    byId(id).checked = checked;
    byId(id).dispatchEvent(new Event('change', { bubbles: true }));
  };
  const field = (id, value) => {
    byId(id).value = value;
  };

  describe('auto-assign-enabled', () => {
    it('shows the settings and makes the author required when enabled', () => {
      change('auto_assign_enabled', true);

      expect(byId('cr_auto_assign_settings').style.display).toBe('');
      expect(byId('auto_assign_author_id').required).toBe(true);
    });

    it('hides the settings and drops the requirement when disabled', () => {
      change('auto_assign_enabled', true);
      change('auto_assign_enabled', false);

      expect(byId('cr_auto_assign_settings').style.display).toBe('none');
      expect(byId('auto_assign_author_id').required).toBe(false);
    });
  });

  describe('auto-assign-filter-enabled', () => {
    it('shows and hides the filter block', () => {
      change('auto_assign_filter_enabled', true);
      expect(byId('auto_assignment_filter_form').style.display).toBe('');

      change('auto_assign_filter_enabled', false);
      expect(byId('auto_assignment_filter_form').style.display).toBe('none');
    });
  });

  describe('add-filter', () => {
    it('marks and focuses an empty expression and sends nothing', async () => {
      byId('add-apply').click();
      await flushReady();

      expect(byId('auto_assign_add_filter_expression').classList.contains('error')).toBe(true);
      expect(document.activeElement.id).toBe('auto_assign_add_filter_expression');
      expect(fetch).not.toHaveBeenCalled();
    });

    it('alerts about an invalid regular expression and sends nothing', async () => {
      const alertSpy = vi.fn();
      vi.stubGlobal('alert', alertSpy);
      field('auto_assign_add_filter_expression', '(');

      byId('add-apply').click();
      await flushReady();

      expect(alertSpy).toHaveBeenCalledTimes(1);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('posts the whole form and shows the new list in #auto_assignment_filters', async () => {
      field('auto_assign_add_filter_expression', 'app/.*\\.rb');

      byId('add-apply').click();
      await flushReady();

      const [url, init] = fetch.mock.calls[0];
      expect(url).toBe(ADD_URL);
      expect(init.method).toBe('POST');
      const body = new URLSearchParams(init.body);
      expect(body.get('setting[tracker_id]')).toBe('1');
      expect(body.get('auto_assign_add_filter[expression]')).toBe('app/.*\\.rb');
      expect(body.getAll('auto_assign[assignable_list][]')).toEqual(['1', '3']);
      expect(byId('auto_assignment_filters').querySelector('.new')).not.toBeNull();
    });
  });

  describe('update-filter', () => {
    it('sends nothing when the edited expression is empty', async () => {
      byId('edit-apply').click();
      await flushReady();

      expect(byId('auto_assign_edit_filter_0_expression').classList.contains('error')).toBe(true);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('posts the form with the filter number', async () => {
      field('auto_assign_edit_filter_0_expression', 'lib/.*\\.rb');

      byId('edit-apply').click();
      await flushReady();

      const [url, init] = fetch.mock.calls[0];
      expect(url).toBe(EDIT_URL);
      expect(init.method).toBe('POST');
      const body = new URLSearchParams(init.body);
      expect(body.get('num')).toBe('0');
      expect(body.get('auto_assign_edit_filter[0][expression]')).toBe('lib/.*\\.rb');
    });

    it('throws when the number attribute is not an integer', () => {
      byId('edit-apply').setAttribute('data-cr-num', 'x');

      expect(() => crActionUpdateFilter(byId('edit-apply'))).toThrowError(/data-cr-num/);
    });
  });

  describe('sort-filter', () => {
    it('loads the list with GET, the form fields and the move request', async () => {
      byId('sort-lower').click();
      await flushReady();

      const [url, init] = fetch.mock.calls[0];
      expect(init.method).toBe('GET');
      const query = new URLSearchParams(url.slice(url.indexOf('?') + 1));
      expect(url.startsWith(`${SORT_URL}?`)).toBe(true);
      expect(query.get('auto_assign_filter[num]')).toBe('2');
      expect(query.get('auto_assign_filter[move_to]')).toBe('lower');
      expect(query.get('setting[tracker_id]')).toBe('1');
    });

    it('does not follow the href="#" link', () => {
      const event = new MouseEvent('click', { bubbles: true, cancelable: true });

      byId('sort-lower').dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
    });
  });

  describe('remove', () => {
    it('removes the target element', () => {
      byId('delete-0').click();

      expect(byId('auto_assign_tr_0')).toBeNull();
    });

    it('throws when the target matches nothing', () => {
      byId('delete-0').setAttribute('data-cr-target', '#nope');

      expect(() => crActionRemove(byId('delete-0'))).toThrowError(/#nope/);
    });
  });

  it('keeps the old list and shows the status when a reload fails', async () => {
    fetch.mockResolvedValue(new Response('', { status: 500, statusText: 'Server Error' }));
    field('auto_assign_add_filter_expression', 'a');

    byId('add-apply').click();
    await flushReady();

    expect(byId('auto_assignment_filters').querySelector('.keep')).not.toBeNull();
    expect(byId('auto_assignment_filters').querySelector('.cr-load-error').textContent).toBe('500 Server Error');
  });
});
