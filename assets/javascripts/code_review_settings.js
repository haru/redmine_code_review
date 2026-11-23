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

// Settings screen (auto-assign). The elements are marked with `data-cr-action`
// in code_review_settings/_show and _filters; the handlers are registered at the
// end of this file.

/**
 * Shows the auto-assign settings block only while it is enabled, and makes
 * the author select required only while the block is visible.
 * @param {Element} checkbox - The `auto_assign[enabled]` checkbox.
 */
function crActionAutoAssignEnabled(checkbox) {
  // A required field inside the hidden block would silently block the form submission.
  crQuery('#auto_assign_author_id').required = checkbox.checked;
  crQuery('#cr_auto_assign_settings').style.display = checkbox.checked ? '' : 'none';
}

/**
 * Shows the auto-assign filter block only while the filter is enabled.
 * @param {Element} checkbox - The `auto_assign[filter_enabled]` checkbox.
 */
function crActionAutoAssignFilterEnabled(checkbox) {
  crQuery('#auto_assignment_filter_form').style.display = checkbox.checked ? '' : 'none';
}

/**
 * Validates that the filter expression field is non-empty and holds a
 * parseable regular expression. An empty field is marked and focused; an
 * unparseable expression is reported with an alert.
 * @param {HTMLInputElement} field - Input field holding the expression.
 * @returns {boolean} True when the expression is usable.
 */
function crValidExpression(field) {
  if (field.value === '') {
    field.classList.add('error');
    field.focus();
    return false;
  }
  try {
    new RegExp(field.value);
  }
  catch (e) {
    alert(e);
    return false;
  }
  return true;
}

/**
 * Collects the fields of the settings form as request parameters; repeated
 * names stay repeated.
 * @returns {URLSearchParams} The form fields.
 */
function crSettingsParams() {
  return new URLSearchParams(new FormData(crQuery('#code_review_form')));
}

/**
 * Reloads the filter list with the settings form fields.
 * @param {string} method - 'GET' or 'POST'.
 * @param {string} url - URL that renders the filter list.
 * @param {URLSearchParams} params - Request parameters.
 * @returns {Promise<void>} Resolves after the list was displayed.
 */
function crReloadFilters(method, url, params) {
  return crLoad(crQuery('#auto_assignment_filters'), url, { method, params });
}

/**
 * Adds the filter from the add form: validates its expression, then reloads
 * the filter list. An invalid expression sends nothing.
 * @param {Element} el - The Apply button of the add form.
 * @returns {Promise<void>|undefined} Resolves after the list was displayed.
 */
function crActionAddFilter(el) {
  if (!crValidExpression(crQuery('#auto_assign_add_filter_expression'))) {
    return undefined;
  }
  return crReloadFilters('POST', crAttr(el, 'data-cr-url'), crSettingsParams());
}

/**
 * Updates the filter at the position of the button: validates the edited
 * expression, then reloads the filter list. An invalid expression sends nothing.
 * @param {Element} el - The Apply button of the edit row.
 * @returns {Promise<void>|undefined} Resolves after the list was displayed.
 */
function crActionUpdateFilter(el) {
  const num = crAttrInt(el, 'data-cr-num');
  if (!crValidExpression(crQuery(`#auto_assign_edit_filter_${num}_expression`))) {
    return undefined;
  }
  const params = crSettingsParams();
  params.set('num', num);
  return crReloadFilters('POST', crAttr(el, 'data-cr-url'), params);
}

/**
 * Moves a filter: loads the filter list with the settings form fields and
 * the move request.
 * @param {Element} el - The sort arrow.
 * @returns {Promise<void>} Resolves after the list was displayed.
 */
function crActionSortFilter(el) {
  const params = crSettingsParams();
  params.set('auto_assign_filter[num]', crAttrInt(el, 'data-cr-num'));
  params.set('auto_assign_filter[move_to]', crAttr(el, 'data-cr-direction'));
  return crReloadFilters('GET', crAttr(el, 'data-cr-url'), params);
}

/**
 * Removes the element named by `data-cr-target`.
 * @param {Element} el - The action element.
 */
function crActionRemove(el) {
  crTarget(el, 'data-cr-target').remove();
}

crRegisterAction('auto-assign-enabled', 'change', crActionAutoAssignEnabled);
crRegisterAction('auto-assign-filter-enabled', 'change', crActionAutoAssignFilterEnabled);
crRegisterAction('add-filter', 'click', crActionAddFilter);
crRegisterAction('update-filter', 'click', crActionUpdateFilter);
crRegisterAction('sort-filter', 'click', crActionSortFilter);
crRegisterAction('remove', 'click', crActionRemove);
