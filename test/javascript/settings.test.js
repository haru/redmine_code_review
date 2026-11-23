import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadClassicScripts } from './support/load_classic_script.js';

function settingsPage() {
  document.body.innerHTML = `
    <div id="content">
      <form id="code_review_form">
        <input name="setting[tracker_id]" value="1">
        <select id="auto_assign_author_id" name="auto_assign[author_id]"></select>
        <input type="hidden" id="auto_assign_filter_num" name="auto_assign[filter][num]" value="0">
        <input type="hidden" id="auto_assign_filter_move_to" name="auto_assign[filter][move_to]" value="highest">
        <input type="text" id="auto_assign_add_filter_expression" name="auto_assign_add_filter[expression]" value="">
        <input type="text" id="auto_assign_edit_filter_0_expression" name="auto_assign_edit_filter[0][expression]" value="">
      </form>
      <input type="checkbox" id="auto_assign_enabled">
      <div id="cr_auto_assign_settings" style="display: none;"></div>
      <input type="checkbox" id="auto_assign_filter_enabled">
      <div id="auto_assignment_filter_form" style="display: none;"></div>
      <div id="auto_assignment_filters"></div>
    </div>`;
}

describe('code_review_settings UI', () => {
  beforeEach(() => {
    // #content must exist before the script loads (keydown guard is bound in a ready handler).
    settingsPage();
    loadClassicScripts();
  });

  describe('setAutoAssignSettingFormEnable', () => {
    it('shows the settings and makes the author required when enabled', () => {
      $('#auto_assign_enabled').prop('checked', true);

      setAutoAssignSettingFormEnable();

      expect($('#cr_auto_assign_settings').css('display')).not.toBe('none');
      expect($('#auto_assign_author_id').prop('required')).toBe(true);
    });

    it('hides the settings and drops the requirement when disabled', () => {
      $('#auto_assign_enabled').prop('checked', true);
      setAutoAssignSettingFormEnable();
      $('#auto_assign_enabled').prop('checked', false);

      setAutoAssignSettingFormEnable();

      expect($('#cr_auto_assign_settings').css('display')).toBe('none');
      expect($('#auto_assign_author_id').prop('required')).toBe(false);
    });
  });

  describe('setAutoAssignSettingFiltersEnable', () => {
    it('shows the filter form when the filter is enabled', () => {
      $('#auto_assign_filter_enabled').prop('checked', true);

      setAutoAssignSettingFiltersEnable();

      expect($('#auto_assignment_filter_form').css('display')).not.toBe('none');
    });

    it('hides the filter form when the filter is disabled', () => {
      $('#auto_assign_filter_enabled').prop('checked', true);
      setAutoAssignSettingFiltersEnable();
      $('#auto_assign_filter_enabled').prop('checked', false);

      setAutoAssignSettingFiltersEnable();

      expect($('#auto_assignment_filter_form').css('display')).toBe('none');
    });
  });

  describe('is_valid_expression', () => {
    it('returns false for an empty expression', () => {

      expect(is_valid_expression($('#auto_assign_add_filter_expression'))).toBe(false);
      expect($('#auto_assign_add_filter_expression').hasClass('error')).toBe(true);
      expect(document.activeElement.id).toBe('auto_assign_add_filter_expression');
    });

    it('alerts and returns false for an invalid regular expression', () => {
      $('#auto_assign_add_filter_expression').val('(');
      const alert = vi.spyOn(window, 'alert').mockReturnValue(undefined);

      expect(is_valid_expression($('#auto_assign_add_filter_expression'))).toBe(false);
      expect(alert).toHaveBeenCalledTimes(1);
    });

    it('returns true for a valid regular expression', () => {
      $('#auto_assign_add_filter_expression').val('app/.*\\.rb');

      expect(is_valid_expression($('#auto_assign_add_filter_expression'))).toBe(true);
    });
  });

  describe('add_assign_filter', () => {
    const addUrl = '/projects/demo/code_review_settings/add_filter';

    it('returns false without loading when the expression is invalid', () => {
      const load = vi.spyOn($.fn, 'load');

      expect(add_assign_filter(addUrl)).toBe(false);
      expect(load).not.toHaveBeenCalled();
    });

    it('loads the filters with the url and the form contents', () => {
      $('#auto_assign_add_filter_expression').val('app/.*\\.rb');
      const load = vi.spyOn($.fn, 'load');

      add_assign_filter(addUrl);

      expect(load).toHaveBeenCalledTimes(1);
      expect(load).toHaveBeenCalledWith(addUrl, expect.objectContaining({
        'setting[tracker_id]': '1',
        'auto_assign_add_filter[expression]': 'app/.*\\.rb'
      }), expect.any(Function));
      expect(load.mock.instances[0].attr('id')).toBe('auto_assignment_filters');
    });
  });

  describe('update_assign_filter', () => {
    const editUrl = '/projects/demo/code_review_settings/edit_filter';

    it('returns false without loading when the expression is invalid', () => {
      const load = vi.spyOn($.fn, 'load');

      expect(update_assign_filter(editUrl, 0)).toBe(false);
      expect(load).not.toHaveBeenCalled();
    });

    it('loads the filters with the form contents and the filter number', () => {
      $('#auto_assign_edit_filter_0_expression').val('lib/.*\\.rb');
      const load = vi.spyOn($.fn, 'load');

      update_assign_filter(editUrl, 0);

      expect(load).toHaveBeenCalledTimes(1);
      expect(load).toHaveBeenCalledWith(editUrl, expect.objectContaining({
        'setting[tracker_id]': '1',
        'auto_assign_edit_filter[0][expression]': 'lib/.*\\.rb',
        'num': 0
      }), expect.any(Function));
      expect(load.mock.instances[0].attr('id')).toBe('auto_assignment_filters');
    });
  });

  describe('cr_sort_filter', () => {
    it('sets the hidden fields and loads the filters with the serialized form', () => {
      const load = vi.spyOn($.fn, 'load');

      cr_sort_filter('/projects/demo/code_review_settings/sort', 'lower', 2);

      expect($('#auto_assign_filter_num').val()).toBe('2');
      expect($('#auto_assign_filter_move_to').val()).toBe('lower');
      expect(load).toHaveBeenCalledTimes(1);
      expect(load).toHaveBeenCalledWith(
        '/projects/demo/code_review_settings/sort',
        'setting%5Btracker_id%5D=1&auto_assign%5Bfilter%5D%5Bnum%5D=2&auto_assign%5Bfilter%5D%5Bmove_to%5D=lower' +
        '&auto_assign_add_filter%5Bexpression%5D=&auto_assign_edit_filter%5B0%5D%5Bexpression%5D=',
        expect.any(Function)
      );
      expect(load.mock.instances[0].attr('id')).toBe('auto_assignment_filters');
    });
  });
});
