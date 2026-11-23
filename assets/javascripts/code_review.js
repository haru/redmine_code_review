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

var ReviewCount = function (total, open, progress) {
  this.total = total;
  this.open = open;
  this.closed = total - open;
  this.progress = progress
};

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

function UpdateRepositoryView(title) {
  var header = $("table.changesets thead tr:first");
  var th = $('<th></th>');
  th.html(title);
  header.append(th);
  $('tr.changeset td.id a:first-child').each(function (i) {
    var revision = this.getAttribute("href");
    revision = revision.substr(revision.lastIndexOf("/") + 1);
    var review = review_counts['revision_' + revision];
    var td = $('<td/>', {
      'class': 'progress'
    });
    td.html(review.progress);
    $(this.parentNode.parentNode).append(td);
  });
}
//add function $.down
if (!$.fn.down)
  (function ($) {
    $.fn.down = function () {
      var el = this[0] && this[0].firstChild;
      while (el && el.nodeType != 1)
        el = el.nextSibling;
      return $(el);
    };
  })(jQuery);

function UpdateRevisionView() {
  $('#changes-legend').after($('#code_review_assignments'));
  $('li.change').each(function () {
    var li = $(this);
    if (li.hasClass('folder')) return;

    // Entries without a link (the legend, deleted files) start with a bare icon;
    // down() ignores its selector, so look for the link among the children instead.
    var a = li.children('a').first();
    if (a.length == 0) return;
    var href = a.attr('href');
    var path = href.replace(urlprefix, '').replace(/\?.*$/, '');

    var reviewlist = code_reviews_map[path];
    if (reviewlist == null) return;

    var ul = $('<ul></ul>');
    for (var j = 0; j < reviewlist.length; j++) {
      var review = reviewlist[j];
      var icon = review.is_closed ? 'icon-closed-review' : 'icon-review';
      var item = $('<li></li>', {
        'class': 'icon ' + icon + ' code_review_summary'
      });
      item.html(review.url);
      ul.append(item);
    }
    li.append(ul);
  });
}

function setAddReviewButton(url, change_id, image_tag, is_readonly, is_diff, attachment_id) {
  var filetables = [];
  var j = 0;
  $('table').each(function () {
    if ($(this).hasClass('filecontent')) {
      filetables[j++] = this;
    }
  });
  j = 0;
  $('table.filecontent th.filename').each(function () {
    filenames[j] = $.trim($(this).text());
    j++;
  });
  addReviewUrl = url + '?change_id=' + change_id + '&action_type=' + action_type +
    '&rev=' + rev + '&rev_to=' + rev_to +
    '&attachment_id=' + attachment_id + '&repository_id=' + encodeURIComponent(repository_id);
  if (path != null && path.length > 0) {
    addReviewUrl = addReviewUrl + '&path=' + encodeURIComponent(path);
  }
  var num = 0;
  if (is_diff) {
    num = 1;
  }
  var i, l, tl;
  for (i = 0, tl = filetables.length; i < tl; i++) {
    var table = filetables[i];
    var trs = table.getElementsByTagName('tr');

    for (j = 0, l = trs.length; j < l; j++) {
      var tr = trs[j];
      var ths = tr.getElementsByTagName('th');

      var th = ths[num];
      if (th == null) {
        continue;
      }

      var line = $(th).data('txt');
      if (line == null || line == "") {
        var a = $(th).find('a');
        if (a.length > 0) {
          line = $(a).data('txt');
        }
      }
      if (line == null || line == "") {
        continue;
      }

      var span_html = '<span white-space="nowrap" id="review_span_' + line + '_' + i + '">';

      if (!is_readonly) {
        span_html += image_tag;
      }
      span_html += '</span>';
      th.innerHTML = span_html;

      var img = th.getElementsByTagName('img')[0];
      if (img != null) {
        img.id = 'add_revew_img_' + line + '_' + i;
        $(img).click(clickPencil);
      }
    }
  }


}

function clickPencil(e) {
  //    alert('$(e.target).attr("id") = ' + $(e.target).attr("id"));
  var result = $(e.target).attr("id").match(/([0-9]+)_([0-9]+)/);
  var line = result[1];
  var file_count = eval(result[2]);
  var url = addReviewUrl + '&line=' + line + '&file_count=' + file_count;

  if (path == null || path.length == 0) {
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

function setShowReviewButton(line, review_id, is_closed, file_count) {
  //alert('file_count = ' + file_count);
  var span = $('#review_span_' + line + '_' + file_count);
  if (span.length == 0) {
    return;
  }
  var innerSpan = $('<span></span>', {
    id: 'review_' + review_id
  });
  span.append(innerSpan);
  innerSpan.html(is_closed ? showClosedReviewImageTag : showReviewImageTag);
  var div = $('<div></div>', {
    'class': 'draggable',
    id: 'show_review_' + review_id
  });
  $('#code_review').append(div);
  innerSpan.down('img').click(function (e) {
    var review_id = $(e.target).parent().attr('id').match(/[0-9]+/)[0];
    var span = $('#review_' + review_id); // span element of view review button
    var pos = span.offset();
    showReview(showReviewUrl, review_id, pos.left + 10 + 5, pos.top + 25);
  });
}

function popupReview(review_id) {
  var span = $('#review_' + review_id); // span element of view review button
  var pos = span.offset();
  $('html,body').animate({
    scrollTop: pos.top
  }, {
    duration: 'fast',
    complete: function () {
      showReview(showReviewUrl, review_id, pos.left + 10 + 5, pos.top)
    }
  });
  // position and show popup dialog
  // create popup dialog
  //var win = showReview(showReviewUrl, review_id, pos.left + 10 + 5, pos.top);
  //    win.toFront();
}

function showReview(url, review_id, x, y) {
  if (code_reviews_dialog_map[review_id] != null) {
    var cur_win = code_reviews_dialog_map[review_id];
    cur_win.hide();
    code_reviews_dialog_map[review_id] = null;
  }
  loadWithErrorDisplay($('#show_review_' + review_id), url, {
    review_id: review_id
  });

  var win = $('#show_review_' + review_id).dialog({
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

function formPopup(x, y) {
  // The dialog may still exist when it was closed with its own X button (hideForm was
  // not called). It is the same element as the new one, so destroy it before reopening.
  if (review_form_dialog != null) {
    review_form_dialog.dialog('destroy');
    review_form_dialog = null;
  }
  //@see http://docs.jquery.com/UI/Effects/Scale
  var win = $('#review-form-frame').dialog({
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

function hideForm() {
  if (review_form_dialog == null) {
    return;
  }
  review_form_dialog.dialog('close');
  review_form_dialog = null;
  $('#review-form').html('');
}

function addReview(url) {
  loadWithErrorDisplay($('#review-form'), url);
}

function make_addreview_link(project, link) {
  var alist = $('div.tabs ul li a#tab-entry');
  if (alist == null) {
    return;
  }
  var a = alist[0];
  var p = a.parentNode.parentNode;
  p.innerHTML = p.innerHTML + link;
}

$.fn.serialize2json = function () {
  var o = {};
  var a = this.serializeArray();
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

function toggleBlind(form, flag) {
  if (flag) {
    form.show('blind');
  }
  else {
    form.hide('blind');
  }
}

function setAutoAssignSettingFormEnable() {
  var form = $('#cr_auto_assign_settings');
  var flag = $('#auto_assign_enabled').is(':checked');
  // A required field inside the hidden block would silently block the form submission.
  $('#auto_assign_author_id').prop('required', flag);
  toggleBlind(form, flag);
}

function setAutoAssignSettingFiltersEnable() {
  var form = $('#auto_assignment_filter_form');
  toggleBlind(form, $('#auto_assign_filter_enabled').is(':checked'));
}

function is_valid_expression(field) {
  var text = field[0].value;
  if (text == '') {
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

function add_assign_filter(url) {
  if (!is_valid_expression($('#auto_assign_add_filter_expression'))) {
    return false;
  }
  var args = $('#code_review_form').serialize2json();
  loadWithErrorDisplay($('#auto_assignment_filters'), url, args);
}

function update_assign_filter(url, num) {
  if (!is_valid_expression($('#auto_assign_edit_filter_' + num + '_expression'))) {
    return false;
  }
  var args = $('#code_review_form').serialize2json();
  args['num'] = num;
  loadWithErrorDisplay($('#auto_assignment_filters'), url, args);
}

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

// jQuery's .load() leaves the target untouched when the request fails, so a 403/404/500
// would be invisible. Show the HTTP status at the top of the target instead.
function loadWithErrorDisplay(target, url, params) {
  target.load(url, params, function (_responseText, status, xhr) {
    if (status !== 'error') {
      return;
    }
    target.children('.cr-load-error').remove();
    target.prepend($('<div class="flash error cr-load-error">').text(xhr.status + ' ' + xhr.statusText));
  });
}

function change_option(url, flag) {
  loadWithErrorDisplay($('#content'), url, {
    show_closed: flag
  });
}

function loadOnReady(selector, url, params) {
  $(function () {
    loadWithErrorDisplay($(selector), url, params);
  });
}

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
  var xhr = e.detail[2];
  alert(xhr.status + ' ' + xhr.statusText);
});

function moveAssignLinkAboveFileContent() {
  $('#content table.filecontent:first').before($('#code-review-assign-link'));
}
