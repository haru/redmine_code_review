/*
# Code Review plugin for Redmine
# Copyright (C) 2009-2010  Haruyuki Iida
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

var ReviewCount = function(total, open, progress){
    this.total = total;
    this.open = open;
    this.closed = total - open;
    this.progress = progress
};

var CodeReview = function(id) {
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
    var header = $$('table.changesets thead tr')[0];
    var th = new Element('th');
    th.innerHTML = title;
    header.insert(th);
    var trs = $$('tr.changeset');
    for (var i = 0; i < trs.length; i++) {
        var tr = trs[i];
        var revision = tr.down('a').getAttribute("href");
        revision = revision.substr(revision.lastIndexOf("/") + 1);
        var review = review_counts['revision_' + revision];
        var td = new Element('td',{
            'class':'progress'
        });
        td.innerHTML = review.progress
        tr.insert(td);
    }
}

function UpdateRevisionView() {
    var lis = $$('li.change');

    for (var i = 0; i < lis.length; i++) {
        var li = lis[i];
        if (li.hasClassName('folder')) {
            continue;
        }
        var ul = new Element('ul');

        var a = li.down('a');
        if (a == null) {
            continue;
        }
        var href = a.getAttribute('href')
        href = href.replace(urlprefix, '');
        var path = href.replace(/\?.*$/, '');

        var reviewlist = code_reviews_map[path];
        if (reviewlist == null){
            continue;
        }
        for (var j = 0; j < reviewlist.length; j++) {
            var review = reviewlist[j];
            var icon = 'icon-review';
            if (review.is_closed) {
                icon = 'icon-closed-review';
            }
            var item = new Element('li', {
                'class': 'icon ' + icon + ' code_review_summary'
                });
            item.innerHTML = review.url;
            ul.insert(item);
        }
        li.insert(ul);

    }
}

function setAddReviewButton(url, change_id, image_tag, is_readonly, is_diff, attachment_id){
    var tables = document.getElementsByTagName('table');
    var filetables = [];
    var j = 0;
    var i = 0;
    for (i = 0; i < tables.length; i++) {
        if (Element.hasClassName(tables[i], 'filecontent')) {
            filetables[j] = tables[i];
            j++;
        }
    }

    for (i = 0; i < filetables.length; i++) {
        var table = filetables[i];
        var tbody = table.getElementsByTagName('tbody')[0];
        var trs = tbody.getElementsByTagName('tr');

        var num = 0;
        if (is_diff) {
            num = 1;
        }

        for (j = 0; j < trs.length; j++) {
            var tr = trs[j];
            var ths = tr.getElementsByTagName('th');

            var th = ths[num];
            if (th == null) {
                continue;
            }

            Element.setStyle(th, {
                'text-align':'left'
            })

            var line = th.innerHTML.match(/[0-9]+/);
            if (line == null) {
                continue;
            }
     
            addReviewUrl = url + '?change_id=' + change_id + '&action_type=' + action_type +
            '&rev=' + rev + '&path=' + encodeURIComponent(path) + '&rev_to=' + rev_to +
            '&attachment_id=' + attachment_id;

            var span = new Element('span', {
                'white-space': 'nowrap'
            });
            span.id = 'review_span_' + line + '_' + i;
            th.insert(span);

            if (is_readonly) {
                continue;
            }
            span.insert(image_tag);

            var img = span.getElementsByTagName('img')[0];
            img.id = 'add_revew_img_' + line + '_' + i;
            //img.oncontextmenu = 'return false;';
            //img.onclick = clickPencil;
            Element.observe(img, 'click', clickPencil);
        }
    }


}

function clickPencil(e)
{
    //alert('e.element().id = ' + e.element().id);
    var result = e.element().id.match(/([0-9]+)_([0-9]+)/);
    var line = result[1];
    var file_count = result[2];
    addReview(addReviewUrl + '&line=' + line + '&file_count=' + file_count);
    formPopup(e, $('review-form-frame'));
    e.preventDefault();
}
var addReviewUrl = null;
var showReviewUrl = null;
var showReviewImageTag = null;
var showClosedReviewImageTag = null;

function setShowReviewButton(line, review_id, is_closed, file_count) {
    //alert('file_count = ' + file_count);
    var span = $('review_span_' + line + '_' + file_count);
    if (span == null) {
        return;
    }
    var innerSpan = new Element('span');
    //alert('line = ' + line + ', review_id = ' + review_id);
    innerSpan.id = 'review_' + review_id;
    span.insert(innerSpan);
    if (is_closed) {
        innerSpan.innerHTML = showClosedReviewImageTag;

    }
    else {
        innerSpan.innerHTML = showReviewImageTag;
    }

    var div = new Element('div', {
        'class':'draggable'
    });
    div.id = 'show_review_' + review_id;
    $('code_review').insert(div);
    innerSpan.down('img').observe('click', function(e) {
        var review_id = e.element().up().id.match(/[0-9]+/);
        var target = $('show_review_' + review_id);
        var win = showReview(showReviewUrl, review_id, target);
      
        win.setLocation(e.pointerY(), e.pointerX() + 5);
        win.show();
    });
}

function popupReview(line, review_id) {
    var target = $('show_review_' + review_id);
    var span = $('review_' + review_id);

    var win = showReview(showReviewUrl, review_id, target);
  
    win.setLocation(span.positionedOffset().top, span.positionedOffset().left + 10 + 5);
    win.toFront();
    win.show();
    span.scrollTo();
    
}

function showReview(url, review_id, element) {
    if (code_reviews_dialog_map[review_id] != null) {
        var cur_win = code_reviews_dialog_map[review_id];
        //        cur_win.setZIndex(topZindex);
        //        topZindex += 10;
        //        return cur_win;
        cur_win.destroy();
        code_reviews_dialog_map[review_id] = null;
    }
    new Ajax.Updater(element, url, {
        asynchronous:false,
        evalScripts:true,
        parameters: 'review_id=' + review_id,
        method:'get'
    });
    var frame_height = $("show_review_" + review_id).style.height;
    var win = new Window({
        className: "mac_os_x",
        width:640,
        height:frame_height,
        zIndex: topZindex,
        resizable: true,
        title: review_dialog_title,
        showEffect:Effect.Grow,
        showEffectOptions:{
            direction: 'top-left'
        },
        hideEffect: Effect.SwitchOff,
        //destroyOnClose: true,
        draggable:true, 
        wiredDrag: true
    });
    win.setContent("show_review_" + review_id);
    win.getContent().style.color = "#484848";
    win.getContent().style.background = "#ffffff";
    topZindex++;
    code_reviews_dialog_map[review_id] = win;
    return win

}

function formPopup(evt, popup){
    var frame_height = $('review-form-frame').style.height;
    var win = null;
    if (review_form_dialog != null) {
        review_form_dialog.destroy();
        review_form_dialog = null;
    }
    
    win = new Window({
        className: "mac_os_x",
        width:640,
        height:frame_height,
        zIndex: topZindex,
        resizable: true,
        title: add_form_title,
        showEffect:Effect.Grow,
        showEffectOptions:{
            direction: 'top-left'
        },
        hideEffect: Effect.SwitchOff,
        //destroyOnClose: true,
        draggable:true,
        wiredDrag: true
    });
    
    win.setZIndex(topZindex);
    win.setContent("review-form-frame");
    win.setLocation(evt.pointerY(), evt.pointerX() + 5);
    win.getContent().style.background = "#ffffff";
    win.show();
    review_form_dialog = win;
    topZindex += 10;

    return false;
}

function hideForm() {
    //alert('aaa');
    //$('review-form-frame').style.visibility = false;
    if (review_form_dialog == null) {
        return;
    }
    review_form_dialog.destroy();
    review_form_dialog = null;
    $('review-form').innerHTML = '';
}
function addReview(url) {
    //alert('aaa');
    new Ajax.Updater('review-form', url, {
        asynchronous:false,
        evalScripts:true,
        method:'get'
    });
}


function deleteReview(review_id) {
    $('show_review_' + review_id).remove();
    $('review_' + review_id).remove();
    
}

function changeImage(review_id, is_closed) {
    var span = $('review_' + review_id);
    var new_image = null;
    var dummy = new Element('span');
    if (is_closed) {
        dummy.insert(showClosedReviewImageTag);
    }
    else {
        dummy.insert(showReviewImageTag);
    }
    new_image = dummy.down().getAttribute('src');
    //alert(new_image);
    span.down('img').setAttribute('src', new_image);

}

function make_addreview_link(project, link) {
    var alist = $$('#content p a');
    if (alist == null) {
        return;
    }
    var a = alist[0];
    var p = a.up();
    p.innerHTML = p.innerHTML + " | " + link;
}

function call_update_revisions(url) {
    var changeset_ids = '';
    var links = $$('table.changesets tbody tr.changeset td.id a');
    for (var i = 0; i < links.length; i++) {
        var link = links[i];
        var href = link.getAttribute('href');
        var id = href.replace(/^.*\/revisions\//, '');
        if (i > 0) {
            changeset_ids += ',';
        }
        changeset_ids += id;
    }
    new Ajax.Updater('code_review_revisions', url,
    {
        evalScripts:true,
        method:'get',
        parameters: 'changeset_ids=' + encodeURI(changeset_ids)
    });
}
