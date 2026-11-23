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

// ---- Repository screens: changeset list, revision view, entry tab, review index ----

/**
 * Adds the review progress column to the repository changeset table. The
 * progress HTML is rendered by the server (progress bar and assign link).
 * @param {Element} el - The `revisions-view` marker element.
 */
function crInitRevisionsView(el) {
  const counts = crAttrJson(el, 'data-cr-review-counts');
  const header = crQuery('table.changesets thead tr');
  const th = document.createElement('th');
  th.textContent = crData(el, 'column-title');
  header.append(th);
  document.querySelectorAll('tr.changeset td.id a:first-child').forEach((link) => {
    const href = link.getAttribute('href');
    const revision = href.slice(href.lastIndexOf('/') + 1);
    if (!(revision in counts)) {
      throw new Error(`code_review: no review count for revision ${revision}`);
    }
    const td = document.createElement('td');
    td.className = 'progress';
    td.innerHTML = counts[revision].progress;
    link.closest('tr').append(td);
  });
}

/**
 * Lists the reviews of each changed file under the revision view entries.
 * @param {Element} el - The `revision-view` marker element.
 */
function crInitRevisionView(el) {
  const urlprefix = crData(el, 'urlprefix');
  const reviews = crAttrJson(el, 'data-cr-reviews');
  const assignments = document.getElementById('code_review_assignments');
  if (assignments) {
    crQuery('#changes-legend').after(assignments);
  }
  document.querySelectorAll('li.change').forEach((li) => {
    // Entries without a link (the legend, deleted files) start with a bare icon.
    const link = li.querySelector(':scope > a');
    if (li.classList.contains('folder') || !link) {
      return;
    }
    const path = link.getAttribute('href').replace(urlprefix, '').replace(/\?.*$/, '');
    if (!(path in reviews)) {
      return;
    }
    const ul = document.createElement('ul');
    for (const review of reviews[path]) {
      const item = document.createElement('li');
      item.className = 'icon ' + (review.closed ? 'icon-closed-review' : 'icon-review') + ' code_review_summary';
      item.innerHTML = review.link;
      ul.append(item);
    }
    li.append(ul);
  });
}

/**
 * Appends the "add review" link to the repository entry tab list.
 * @param {Element} el - The `entry-link` marker element.
 */
function crInitEntryLink(el) {
  const tab = document.querySelector('div.tabs ul li a#tab-entry');
  if (!tab) {
    throw new Error('code_review: entry tab (#tab-entry) not found');
  }
  tab.parentNode.parentNode.insertAdjacentHTML('beforeend', crData(el, 'link'));
}

/**
 * Reloads the content with closed reviews shown or hidden.
 * @param {Element} el - The `show_closed` checkbox.
 * @returns {Promise<void>} Resolves after the content was displayed.
 */
function crActionToggleClosed(el) {
  return crLoad(crQuery('#content'), crAttr(el, 'data-cr-url'),
    { method: 'POST', params: { show_closed: el.checked } });
}

// ---- Diff / revision / file view: reviews on the line number cells ----------

// State of the diff view currently on the page. Top-level var:
// the test harness re-runs this script per test.
var crDiff = null;

/**
 * Reads the diff view state from the `diff-view` marker.
 * @param {Element} el - The `diff-view` marker element.
 * @returns {object} The DiffViewState.
 */
function crReadDiffState(el) {
  const query = new URLSearchParams({
    change_id: crData(el, 'change-id'),
    action_type: crData(el, 'action-type'),
    rev: crData(el, 'rev'),
    rev_to: crData(el, 'rev-to'),
    attachment_id: crData(el, 'attachment-id'),
    repository_id: crData(el, 'repository-id')
  });
  const path = crData(el, 'path');
  if (path !== '') {
    query.set('path', path);
  }
  return {
    addReviewUrl: crData(el, 'add-review-url') + '?' + query,
    showReviewUrl: crData(el, 'show-review-url'),
    images: { add: crData(el, 'add-image'), show: crData(el, 'show-image'), showClosed: crData(el, 'show-closed-image') },
    titles: { addForm: crData(el, 'add-form-title'), reviewDialog: crData(el, 'review-dialog-title') },
    path,
    readonly: crAttrBool(el, 'data-cr-readonly'),
    diff: crAttrBool(el, 'data-cr-diff'),
    filenames: Array.from(document.querySelectorAll('table.filecontent th.filename'),
      (th) => th.textContent.trim())
  };
}

/**
 * Reads the line number of a number cell, from the cell itself or its link.
 * @param {Element} th - Number cell of the diff table.
 * @returns {string} The line number, empty when the cell has none.
 */
function crLineOf(th) {
  const own = th.getAttribute('data-txt');
  if (own) {
    return own;
  }
  const link = th.querySelector('a');
  return (link && link.getAttribute('data-txt')) || '';
}

/**
 * Puts the "add review" pencil on every line number cell of the diff.
 */
function setAddReviewButton() {
  const column = crDiff.diff ? 1 : 0;
  document.querySelectorAll('table.filecontent').forEach((table, fileCount) => {
    table.querySelectorAll('tr').forEach((tr) => {
      const th = tr.querySelectorAll('th')[column];
      const line = th && crLineOf(th);
      if (!line) {
        return;
      }
      // Build the span with DOM APIs so the data-txt value is never parsed as HTML.
      const span = document.createElement('span');
      span.setAttribute('white-space', 'nowrap');
      span.id = `review_span_${line}_${fileCount}`;
      span.innerHTML = crDiff.readonly ? '' : crDiff.images.add;
      th.replaceChildren(span);
      const img = th.querySelector('img');
      if (img) {
        img.id = `add_revew_img_${line}_${fileCount}`;
        img.addEventListener('click', clickPencil);
      }
    });
  });
}

/**
 * Opens the review form popup for the clicked diff line.
 * @param {Event} event - Click event fired on the pencil image.
 */
function clickPencil(event) {
  const [, line, fileIndex] = event.target.id.match(/([0-9]+)_([0-9]+)/);
  const fileCount = Number.parseInt(fileIndex, 10);
  const query = new URLSearchParams({ line, file_count: fileCount });
  if (crDiff.path === '') {
    const filename = crDiff.filenames[fileCount];
    if (filename === undefined) {
      throw new Error(`code_review: no file name for file ${fileCount} in the diff`);
    }
    query.set('path', filename);
    query.set('diff_all', 'true');
  }
  addReview(crDiff.addReviewUrl + '&' + query);
  formPopup();
  event.preventDefault();
}

/**
 * Places the review icon on the diff line and wires it to the review popup.
 * @param {number|string} line - Line number the review belongs to.
 * @param {number} reviewId - Id of the review issue.
 * @param {boolean} isClosed - True when the review is closed.
 * @param {number} fileCount - Index of the file within the diff.
 */
function setShowReviewButton(line, reviewId, isClosed, fileCount) {
  const span = document.getElementById(`review_span_${line}_${fileCount}`);
  if (!span) {
    return;
  }
  const inner = document.createElement('span');
  inner.id = `review_${reviewId}`;
  inner.innerHTML = isClosed ? crDiff.images.showClosed : crDiff.images.show;
  span.append(inner);
  const popup = document.createElement('div');
  popup.id = `show_review_${reviewId}`;
  document.getElementById('code_review').append(popup);
  const img = inner.querySelector('img');
  if (img) {
    img.addEventListener('click', () => showReview(reviewId));
  }
}

/**
 * Scrolls to the review icon and opens the review popup.
 * @param {number} reviewId - Id of the review issue.
 */
function popupReview(reviewId) {
  const icon = document.getElementById(`review_${reviewId}`);
  if (!icon) {
    throw new Error(`code_review: review ${reviewId} has no icon on this page`);
  }
  window.scrollTo(0, icon.getBoundingClientRect().top + window.scrollY);
  showReview(reviewId);
}

/**
 * Loads the review into its popup and shows it.
 * @param {number} reviewId - Id of the review issue.
 * @returns {Promise<void>} Resolves after the review was displayed.
 */
function showReview(reviewId) {
  const el = document.getElementById(`show_review_${reviewId}`);
  crOpenDialog(el, { title: crDiff.titles.reviewDialog });
  return crLoad(el, crDiff.showReviewUrl, { method: 'POST', params: { review_id: reviewId } });
}

/**
 * Empties the add-review form; runs whenever its popup closes.
 */
function crClearReviewForm() {
  document.getElementById('review-form').innerHTML = '';
}

/**
 * Opens the add-review form popup. Closing it by any route empties the form.
 */
function formPopup() {
  crOpenDialog(document.getElementById('review-form-frame'), {
    title: crDiff.titles.addForm,
    onClose: crClearReviewForm
  });
}

/**
 * Closes the add-review form popup and empties its form.
 */
function hideForm() {
  crCloseDialog(document.getElementById('review-form-frame'));
}

/**
 * Loads the add-review form into the popup frame.
 * @param {string} url - URL that renders the form.
 * @returns {Promise<void>} Resolves after the form was displayed.
 */
function addReview(url) {
  return crLoad(document.getElementById('review-form'), url, { method: 'GET' });
}

/**
 * Moves the code-review assignment link above the file content table.
 */
function moveAssignLinkAboveFileContent() {
  const table = document.querySelector('#content table.filecontent');
  const link = document.getElementById('code-review-assign-link');
  if (table && link) {
    table.before(link);
  }
}

/**
 * Initializes the diff view from its `diff-view` marker.
 * @param {Element} el - The marker element.
 */
function crInitDiffView(el) {
  crDiff = crReadDiffState(el);
  setAddReviewButton();
  for (const review of crAttrJson(el, 'data-cr-reviews')) {
    setShowReviewButton(review.line, review.id, review.closed, review.file_count);
  }
  if (el.hasAttribute('data-cr-popup-review-id')) {
    popupReview(crAttrInt(el, 'data-cr-popup-review-id'));
  }
  moveAssignLinkAboveFileContent();
}

/**
 * Handles the `review-added` marker: closes the form and shows the new icon.
 * @param {Element} el - The marker element.
 */
function crInitReviewAdded(el) {
  const line = crAttrInt(el, 'data-cr-line');
  const fileCount = crAttrInt(el, 'data-cr-file-count');
  if (!document.getElementById(`review_span_${line}_${fileCount}`)) {
    throw new Error(`code_review: no line ${line} in file ${fileCount} to show the new review on`);
  }
  hideForm();
  setShowReviewButton(line, crAttrInt(el, 'data-cr-review-id'), false, fileCount);
}

/**
 * Handles the `load` marker: loads the marker's content with POST.
 * @param {Element} el - The marker element, also the load target.
 */
function crInitLoad(el) {
  crLoad(el, crAttr(el, 'data-cr-url'), { method: 'POST', params: crAttrJson(el, 'data-cr-params') });
}

/**
 * Shows or hides the elements named by `data-cr-show` / `data-cr-hide`.
 * @param {Element} el - The action element.
 */
function crActionDisplay(el) {
  if (el.hasAttribute('data-cr-show')) {
    crTarget(el, 'data-cr-show').style.display = '';
  }
  if (el.hasAttribute('data-cr-hide')) {
    crTarget(el, 'data-cr-hide').style.display = 'none';
  }
}

/**
 * Toggles the `data-cr-target` element and focuses `data-cr-focus` when shown.
 * @param {Element} el - The action element.
 */
function crActionToggle(el) {
  const target = crTarget(el, 'data-cr-target');
  const show = target.style.display === 'none';
  target.style.display = show ? '' : 'none';
  if (show && el.hasAttribute('data-cr-focus')) {
    crTarget(el, 'data-cr-focus').focus();
  }
}

/**
 * Sends a form with crLoad and shows the response in a target.
 * @param {string} formSelector - Selector of the form to send.
 * @param {string} targetSelector - Selector of the element showing the response.
 * @param {string} url - URL to send the form to.
 * @param {'GET'|'POST'} method - HTTP method.
 * @returns {Promise<void>} Resolves after the response was displayed.
 */
function crSubmitForm(formSelector, targetSelector, url, method) {
  return crLoad(crQuery(targetSelector), url, { method, params: new FormData(crQuery(formSelector)) });
}

/**
 * Sets the value of the `data-cr-target` element to `data-cr-value`.
 * @param {Element} el - The action element.
 */
function crActionSetValue(el) {
  crTarget(el, 'data-cr-target').value = crAttr(el, 'data-cr-value');
}

/**
 * Sends the review form with POST and shows the result in the popup.
 * @param {Element} el - The action element.
 * @returns {Promise<void>} Resolves after the result was displayed.
 */
function crActionSubmitReviewForm(el) {
  return crSubmitForm('#review_form', '#review-form', crAttr(el, 'data-cr-url'), 'POST');
}

/**
 * Reloads the review form (GET) keeping the values typed so far.
 * @param {Element} el - The action element.
 * @returns {Promise<void>} Resolves after the form was displayed.
 */
function crActionReloadReviewForm(el) {
  return crSubmitForm('#review_form', '#review-form', crAttr(el, 'data-cr-url'), 'GET');
}

/**
 * Sends an update or reply form of a shown review (GET) and shows the result.
 * @param {Element} el - The action element.
 * @returns {Promise<void>} Resolves after the result was displayed.
 */
function crActionApplyPopupForm(el) {
  return crSubmitForm('#' + crAttr(el, 'data-cr-form'), '#show_review_' + crAttr(el, 'data-cr-review-id'),
    crAttr(el, 'data-cr-url'), 'GET');
}

// Document-level listeners, bound once (the review partial is rendered on every
// popup load): the delete link's rails-ujs result (reload only when the delete
// succeeded; a failed delete must not look like a success) and the arrow-key
// guard for the review dialogs.
if (!globalThis.crDiffListenersBound) {
  globalThis.crDiffListenersBound = true;
  document.addEventListener('ajax:success', (event) => crOnDeleteResult(event, true));
  document.addEventListener('ajax:error', (event) => crOnDeleteResult(event, false));
  crReady(() => document.body.addEventListener('keydown', crKeepArrowKeysInDialog));
}

/**
 * Handles the outcome of the delete link.
 * @param {CustomEvent} event - rails-ujs `ajax:success` / `ajax:error` event.
 * @param {boolean} succeeded - True for `ajax:success`.
 */
function crOnDeleteResult(event, succeeded) {
  if (!event.target.closest('#delete-review-link')) {
    return;
  }
  if (succeeded) {
    location.reload();
    return;
  }
  // rails-ujs passes [response, statusText, xhr] as event.detail
  const xhr = event.detail[2];
  // status 0 means the request never got an answer (network failure)
  alert(xhr.status === 0 ? 'Network error' : xhr.status + ' ' + xhr.statusText);
}

/**
 * Redmine core binds ← / → on `document` to the previous/next file link and
 * does not skip input fields, so typing in a review dialog would navigate
 * away. Stop the event below `document`; without preventDefault the caret
 * still moves.
 * @param {KeyboardEvent} event - keydown event.
 */
function crKeepArrowKeysInDialog(event) {
  if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') &&
      event.target.closest('.cr-dialog') && event.target.matches('input, textarea, select')) {
    event.stopPropagation();
  }
}

crRegisterInit('diff-view', crInitDiffView);
crRegisterInit('revisions-view', crInitRevisionsView);
crRegisterInit('revision-view', crInitRevisionView);
crRegisterInit('entry-link', crInitEntryLink);
crRegisterInit('review-added', crInitReviewAdded);
crRegisterInit('load', crInitLoad);
crRegisterAction('display', 'click', crActionDisplay);
crRegisterAction('toggle-closed', 'change', crActionToggleClosed);
crRegisterAction('toggle', 'click', crActionToggle);
crRegisterAction('cancel-review-form', 'click', hideForm);
crRegisterAction('set-value', 'click', crActionSetValue);
crRegisterAction('submit-review-form', 'click', crActionSubmitReviewForm);
crRegisterAction('reload-review-form', 'change', crActionReloadReviewForm);
crRegisterAction('apply-popup-form', 'click', crActionApplyPopupForm);
