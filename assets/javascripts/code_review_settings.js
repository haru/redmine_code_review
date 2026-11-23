/*
# Code Review plugin for Redmine
# Copyright (C) 2009-  Haruyuki Iida
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 2
# of the License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

// Settings screen (auto-assign). Still jQuery based; rewritten in plain JavaScript by the settings task.

/**
 * jQuery extension serializing the form fields into an object; repeated
 * names become arrays of values.
 * @returns {object} Field name/value pairs of the form.
 */
$.fn.serialize2json = function () {
  const o = {};
  const a = this.serializeArray();
  $.each(a, function () {
    if (o[this.name]) {
      if (!o[this.name].push) {
        o[this.name] = [o[this.name]];
      }
      o[this.name].push(this.value || '');
    } else {
      o[this.name] = this.value || '';
    }
  });
  return o;
};

/**
 * Shows or hides an element with the jQuery UI "blind" effect.
 * @param {jQuery} form - Element to show or hide.
 * @param {boolean} flag - True to show, false to hide.
 */
function toggleBlind(form, flag) {
  if (flag) {
    form.show('blind');
  }
  else {
    form.hide('blind');
  }
}

/**
 * Shows the auto-assign settings block only while it is enabled, and makes
 * the author select required only while the block is visible.
 */
function setAutoAssignSettingFormEnable() {
  const form = $('#cr_auto_assign_settings');
  const flag = $('#auto_assign_enabled').is(':checked');
  // A required field inside the hidden block would silently block the form submission.
  $('#auto_assign_author_id').prop('required', flag);
  toggleBlind(form, flag);
}

/**
 * Shows the auto-assign filter block only while the filter is enabled.
 */
function setAutoAssignSettingFiltersEnable() {
  const form = $('#auto_assignment_filter_form');
  toggleBlind(form, $('#auto_assign_filter_enabled').is(':checked'));
}

/**
 * Validates that the filter expression field is non-empty and holds a
 * parseable regular expression.
 * @param {jQuery} field - Input field holding the expression.
 * @returns {boolean} True when the expression is usable.
 */
function is_valid_expression(field) {
  const text = field[0].value;
  if (text === '') {
    field.addClass('error').focus();
    return false;
  }

  try {
    new RegExp(text);
  }
  catch (e) {
    alert(e);
    return false;
  }

  return true;
}

/**
 * Reloads the filter list after adding the filter from the add form.
 * @param {string} url - URL that renders the filter list.
 * @returns {boolean} True when the reload was started, false when the new
 *   filter expression is invalid.
 */
function add_assign_filter(url) {
  if (!is_valid_expression($('#auto_assign_add_filter_expression'))) {
    return false;
  }
  const args = $('#code_review_form').serialize2json();
  loadWithErrorDisplay($('#auto_assignment_filters'), url, args);
  return true;
}

/**
 * Reloads the filter list after updating the filter at the given position.
 * @param {string} url - URL that renders the filter list.
 * @param {number} num - Position of the filter to update.
 * @returns {boolean} True when the reload was started, false when the new
 *   filter expression is invalid.
 */
function update_assign_filter(url, num) {
  if (!is_valid_expression($('#auto_assign_edit_filter_' + num + '_expression'))) {
    return false;
  }
  const args = $('#code_review_form').serialize2json();
  args['num'] = num;
  loadWithErrorDisplay($('#auto_assignment_filters'), url, args);
  return true;
}

/**
 * Moves the filter at the given position by loading the filter list with the
 * serialized settings form and the move request.
 * @param {string} url - URL that renders the filter list.
 * @param {'highest'|'higher'|'lower'|'lowest'} action - Direction to move the filter.
 * @param {number} num - Position of the filter to move.
 */
function cr_sort_filter(url, action, num) {
  $('#auto_assign_filter_num').val(num);
  $('#auto_assign_filter_move_to').val(action);
  loadWithErrorDisplay($('#auto_assignment_filters'), url, $('#code_review_form').serialize());
}
