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

var topZindex = 1000;
var action_type = '';
var rev = '';
var rev_to = '';
var path = '';
var urlprefix = '';
var review_form_dialog = null;
var add_form_title = null;
var review_dialog_title = null;
var repository_id = null;
var filenames = [];

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
var code_reviews_dialog_map = new Array();

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
 * Places the "add review" pencil on every line number cell of the diff.
 * @param {string} url - Base URL of the add-review form.
 * @param {string} change_id - Id of the reviewed change, empty when an
 *   attachment is reviewed.
 * @param {string} image_tag - HTML of the pencil image.
 * @param {boolean} is_readonly - True when the user may not add reviews.
 * @param {boolean} is_diff - True for a diff (a whole-changeset diff or a patch
 *   attachment), where the 2nd column holds the line numbers.
 * @param {string} attachment_id - Id of the reviewed attachment, empty for changes.
 */
function setAddReviewButton(url, change_id, image_tag, is_readonly, is_diff, attachment_id) {
  const filetables = $('table.filecontent').toArray();
  $('table.filecontent th.filename').each(function (index) {
    filenames[index] = $.trim($(this).text());
  });
  addReviewUrl = url + '?change_id=' + change_id + '&action_type=' + action_type +
    '&rev=' + rev + '&rev_to=' + rev_to +
    '&attachment_id=' + attachment_id + '&repository_id=' + encodeURIComponent(repository_id);
  if (path != null && path.length > 0) {
    addReviewUrl = addReviewUrl + '&path=' + encodeURIComponent(path);
  }
  let num = 0;
  if (is_diff) {
    num = 1;
  }
  for (let i = 0; i < filetables.length; i++) {
    const table = filetables[i];
    const trs = table.getElementsByTagName('tr');

    for (let j = 0; j < trs.length; j++) {
      const tr = trs[j];
      const ths = tr.getElementsByTagName('th');

      const th = ths[num];
      if (th == null) {
        continue;
      }

      let line = $(th).data('txt');
      if (line == null || line === "") {
        const a = $(th).find('a');
        if (a.length > 0) {
          line = $(a).data('txt');
        }
      }
      if (line == null || line === "") {
        continue;
      }

      let span_html = '<span white-space="nowrap" id="review_span_' + line + '_' + i + '">';

      if (!is_readonly) {
        span_html += image_tag;
      }
      span_html += '</span>';
      th.innerHTML = span_html;

      const img = th.getElementsByTagName('img')[0];
      if (img != null) {
        img.id = 'add_revew_img_' + line + '_' + i;
        $(img).click(clickPencil);
      }
    }
  }


}

/**
 * Opens the review form popup for the clicked diff line.
 * @param {jQuery.Event} e - Click event fired on the pencil image.
 */
function clickPencil(e) {
  //    alert('$(e.target).attr("id") = ' + $(e.target).attr("id"));
  const result = $(e.target).attr("id").match(/([0-9]+)_([0-9]+)/);
  const line = result[1];
  const file_count = eval(result[2]);
  let url = addReviewUrl + '&line=' + line + '&file_count=' + file_count;

  if (path == null || path.length === 0) {
    url = url + '&path=' + encodeURIComponent(filenames[file_count]) + '&diff_all=true';
  }
  addReview(url);
  formPopup(e.pageX, e.pageY);
  e.preventDefault();
}
var addReviewUrl = null;
var showReviewUrl = null;
var showReviewImageTag = null;
var showClosedReviewImageTag = null;

/**
 * Places the review icon on the diff line and wires it to the review popup.
 * @param {number|string} line - Line number the review belongs to.
 * @param {number} review_id - Id of the review issue.
 * @param {boolean} is_closed - True when the review is closed.
 * @param {number} file_count - Index of the file within the diff.
 */
function setShowReviewButton(line, review_id, is_closed, file_count) {
  //alert('file_count = ' + file_count);
  const span = $('#review_span_' + line + '_' + file_count);
  if (span.length === 0) {
    return;
  }
  const innerSpan = $('<span></span>', {
    id: 'review_' + review_id
  });
  span.append(innerSpan);
  innerSpan.html(is_closed ? showClosedReviewImageTag : showReviewImageTag);
  const div = $('<div></div>', {
    'class': 'draggable',
    id: 'show_review_' + review_id
  });
  $('#code_review').append(div);
  innerSpan.down('img').click(function (e) {
    const review_id = $(e.target).parent().attr('id').match(/[0-9]+/)[0];
    const span = $('#review_' + review_id); // span element of view review button
    const pos = span.offset();
    showReview(showReviewUrl, review_id, pos.left + 10 + 5, pos.top + 25);
  });
}

/**
 * Scrolls to the review icon and opens the review popup.
 * @param {number} review_id - Id of the review issue.
 */
function popupReview(review_id) {
  const span = $('#review_' + review_id); // span element of view review button
  const pos = span.offset();
  $('html,body').animate({
    scrollTop: pos.top
  }, {
    duration: 'fast',
    /**
     * Opens the review popup once the scroll animation finished.
     */
    complete: function () {
      showReview(showReviewUrl, review_id, pos.left + 10 + 5, pos.top)
    }
  });
  // position and show popup dialog
  // create popup dialog
  //var win = showReview(showReviewUrl, review_id, pos.left + 10 + 5, pos.top);
  //    win.toFront();
}

/**
 * Loads the review into a dialog and shows it.
 * @param {string} url - URL that renders the review.
 * @param {number} review_id - Id of the review issue.
 * @returns {jQuery} The opened dialog element.
 */
function showReview(url, review_id) {
  if (code_reviews_dialog_map[review_id] != null) {
    const cur_win = code_reviews_dialog_map[review_id];
    cur_win.hide();
    code_reviews_dialog_map[review_id] = null;
  }
  loadWithErrorDisplay($('#show_review_' + review_id), url, {
    review_id: review_id
  });

  const win = $('#show_review_' + review_id).dialog({
    show: {
      effect: 'scale'
    }, // ? 'top-left'
    //position: [x, y + 5],
    width: 640,
    zIndex: topZindex,
    title: review_dialog_title
  });
  //    win.getContent().style.color = "#484848";
  //    win.getContent().style.background = "#ffffff";
  topZindex++;
  code_reviews_dialog_map[review_id] = win;
  $('.ui-dialog').appendTo('#content');
  return win
}

/**
 * Opens the add-review form dialog.
 * @returns {boolean} Always false, so callers can use it to stop event handling.
 */
function formPopup() {
  // The dialog may still exist when it was closed with its own X button (hideForm was
  // not called). It is the same element as the new one, so destroy it before reopening.
  if (review_form_dialog != null) {
    review_form_dialog.dialog('destroy');
    review_form_dialog = null;
  }
  //@see http://docs.jquery.com/UI/Effects/Scale
  const win = $('#review-form-frame').dialog({
    show: {
      effect: 'scale',
      direction: 'both'
    }, // ? 'top-left'
    //        position: [x, y + 5],
    width: 640,
    zIndex: topZindex,
    title: add_form_title
  });
  //    win.getContent().style.background = "#ffffff";
  review_form_dialog = win;
  topZindex += 10;
  $('.ui-dialog').appendTo('#content');
  return false;
}

/**
 * Closes the add-review form dialog and empties its form.
 */
function hideForm() {
  if (review_form_dialog == null) {
    return;
  }
  review_form_dialog.dialog('close');
  review_form_dialog = null;
  $('#review-form').html('');
}

/**
 * Loads the add-review form into the popup frame.
 * @param {string} url - URL that renders the form.
 */
function addReview(url) {
  loadWithErrorDisplay($('#review-form'), url);
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
// Redmine core binds ← / → on `document` to the previous/next file link and does not skip
// input fields, so typing in a review dialog would navigate away. Dialogs are moved into
// #content, so stop the event there, before it reaches `document`; without preventDefault
// the caret still moves.
$(function () {
  $('#content').on('keydown', '.ui-dialog :input', function (e) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.stopPropagation();
    }
  });
});

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

/**
 * Loads `url` into the element matched by `selector` on document ready.
 * @param {string} selector - Selector of the target element.
 * @param {string} url - URL to load.
 * @param {object | string} [params] - Request parameters passed to jQuery.load.
 */
function loadOnReady(selector, url, params) {
  $(function () {
    loadWithErrorDisplay($(selector), url, params);
  });
}

/**
 * Reloads the review form when the tracker select changes.
 * @param {string} url - URL that renders the review form.
 */
function bindReviewFormTrackerChange(url) {
  $(function () {
    $('#issue_tracker_id').change(function () {
      loadWithErrorDisplay($('#review-form'), url + '?' + $('#review_form').serialize());
    });
  });
}

// Bound once here (the review partial is rendered on every popup load). Reload only when
// the delete succeeded; a failed delete must not look like a success.
$(document).on('ajax:success', '#delete-review-link', function () {
  location.reload();
});
$(document).on('ajax:error', '#delete-review-link', function (e) {
  // rails-ujs passes [response, statusText, xhr] as event.detail
  const xhr = e.detail[2];
  alert(xhr.status + ' ' + xhr.statusText);
});

/**
 * Moves the code-review assignment link above the file content table.
 */
function moveAssignLinkAboveFileContent() {
  $('#content table.filecontent:first').before($('#code-review-assign-link'));
}
