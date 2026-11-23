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

var urlprefix = '';

/**
 * Holds the review counters shown for a revision in the changeset list.
 * @class
 * @param {number} total - Total number of reviews for the revision.
 * @param {number} open - Number of still-open reviews.
 * @param {string} progress - HTML snippet of the progress bar.
 */
var ReviewCount = function (total, open, progress) {
  this.total = total;
  this.open = open;
  this.closed = total - open;
  this.progress = progress
};

/**
 * A single code review shown next to a changed file.
 * @class
 * @param {number} id - Id of the review issue.
 */
var CodeReview = function (id) {
  this.id = id;
  this.path = '';
  this.line = 0;
  this.url = '';
  this.is_closed = false;
};

var review_counts = new Array();
var code_reviews_map = new Array();

/**
 * Adds the review progress column to the repository changeset table.
 * @param {string} title - Header text of the new column.
 */
function UpdateRepositoryView(title) {
  const header = $("table.changesets thead tr:first");
  const th = $('<th></th>');
  th.html(title);
  header.append(th);
  $('tr.changeset td.id a:first-child').each(function () {
    let revision = this.getAttribute("href");
    revision = revision.substr(revision.lastIndexOf("/") + 1);
    const review = review_counts['revision_' + revision];
    const td = $('<td/>', {
      'class': 'progress'
    });
    td.html(review.progress);
    $(this.parentNode.parentNode).append(td);
  });
}
//add function $.down
if (!$.fn.down) {
  (function ($) {
    /**
     * jQuery extension returning the first element child as a jQuery object
     * (the Prototype.js helper some templates still rely on). Any selector
     * argument is ignored, unlike Prototype's down(selector).
     * @returns {jQuery} The first element child of the matched element.
     */
    $.fn.down = function () {
      let el = this[0] && this[0].firstChild;
      while (el && el.nodeType !== 1) {
        el = el.nextSibling;
      }
      return $(el);
    };
  })(jQuery);
}

/**
 * Lists the reviews of each changed file under the revision view entries.
 */
function UpdateRevisionView() {
  $('#changes-legend').after($('#code_review_assignments'));
  $('li.change').each(function () {
    const li = $(this);
    if (li.hasClass('folder')) { return; }

    // Entries without a link (the legend, deleted files) start with a bare icon;
    // down() ignores its selector, so look for the link among the children instead.
    const a = li.children('a').first();
    if (a.length === 0) { return; }
    const href = a.attr('href');
    const path = href.replace(urlprefix, '').replace(/\?.*$/, '');

    const reviewlist = code_reviews_map[path];
    if (reviewlist == null) { return; }

    const ul = $('<ul></ul>');
    for (let j = 0; j < reviewlist.length; j++) {
      const review = reviewlist[j];
      const icon = review.is_closed ? 'icon-closed-review' : 'icon-review';
      const item = $('<li></li>', {
        'class': 'icon ' + icon + ' code_review_summary'
      });
      item.html(review.url);
      ul.append(item);
    }
    li.append(ul);
  });
}

/**
 * Appends a link to the repository entry tab.
 * @param {string} project - Unused; kept so call sites keep their argument order.
 * @param {string} link - HTML of the link to append.
 */
function make_addreview_link(project, link) {
  const alist = $('div.tabs ul li a#tab-entry');
  if (alist == null) {
    return;
  }
  const a = alist[0];
  const p = a.parentNode.parentNode;
  p.innerHTML = p.innerHTML + link;
}

/**
 * Loads `url` into the target via jQuery.load, showing the HTTP status at
 * the top of the target when the request fails (plain .load() would leave
 * it unchanged and the error invisible).
 * @param {jQuery} target - Element to load the response into.
 * @param {string} url - URL to load.
 * @param {object | string} [params] - Request parameters passed to jQuery.load.
 */
function loadWithErrorDisplay(target, url, params) {
  target.load(url, params, function (_responseText, status, xhr) {
    if (status !== 'error') {
      return;
    }
    target.children('.cr-load-error').remove();
    target.prepend($('<div class="flash error cr-load-error">').text(xhr.status + ' ' + xhr.statusText));
  });
}

/**
 * Reloads the content with closed reviews shown or hidden.
 * @param {string} url - URL that renders the content.
 * @param {boolean} flag - True to show closed reviews.
 */
function change_option(url, flag) {
  loadWithErrorDisplay($('#content'), url, {
    show_closed: flag
  });
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
      th.innerHTML = `<span white-space="nowrap" id="review_span_${line}_${fileCount}">` +
        (crDiff.readonly ? '' : crDiff.images.add) + '</span>';
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
crRegisterInit('review-added', crInitReviewAdded);
crRegisterInit('load', crInitLoad);
crRegisterAction('display', 'click', crActionDisplay);
crRegisterAction('toggle', 'click', crActionToggle);
crRegisterAction('cancel-review-form', 'click', hideForm);
crRegisterAction('set-value', 'click', crActionSetValue);
crRegisterAction('submit-review-form', 'click', crActionSubmitReviewForm);
crRegisterAction('reload-review-form', 'change', crActionReloadReviewForm);
crRegisterAction('apply-popup-form', 'click', crActionApplyPopupForm);
