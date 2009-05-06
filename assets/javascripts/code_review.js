/*
# Code Review plugin for Redmine
# Copyright (C) 2009  Haruyuki Iida
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
var draggables = [];
var topZindex = 1000;

function getIEversion() {
    if (!Prototype.Browser.IE) {
        return -1;
    }
    var ienum = navigator.userAgent.match(new RegExp("MSIE [0-9]{1,2}\.[0-9]{1,3}"));
    return parseInt(String(ienum).replace("MSIE ",""));
}

function isIE6() {
    if (getIEversion() == 6) {
        return true;
    }
    return false;
}

function isIE7() {
    if (getIEversion() == 7) {
        return true;
    }
    return false;
}

function setAddReviewButton(url, change_id, image_tag, is_readonly){
  var trs = $$('table.filecontent tr');
  trs.each(function(tr){
      th = tr.down('th', 1);
      if (th == null) {
          return;
      }
      th.setStyle({'text-align':'left'});

      var line = th.innerHTML.match(/[0-9]+/);
      if (line == null) {
          return;
      }
      var newurl = url + '?change_id=' + change_id;
      var span = new Element('span', {'white-space': 'nowrap'});
      span.id = 'review_span_' + line;
      th.insert(span);

      if (is_readonly) {
          return;
      }
      span.insert(image_tag);      
      var img = span.down('img');
      img.id = 'add_revew_img_' + line;
      //img.oncontextmenu = 'return false;';
      img.observe('click', function(e) {
          var line = e.element().id.match(/[0-9]+/);
          addReview(newurl + '&line=' + line);
          formPopup(e, $('review-form-frame'));
          e.preventDefault();
      });
      
  });

  
}

var showReviewUrl = null;
var showReviewImageTag = null;

function setShowReviewButton(line, review_id) {
  var span = $('review_span_' + line);
  var innerSpan = new Element('span');
  //alert('review_id = ' + review_id);
  innerSpan.id = 'review_' + review_id;
  span.insert(innerSpan);
  innerSpan.innerHTML = showReviewImageTag;
  var div = new Element('div', {style:'position:absolute; display:none;', 'class':'draggable'});
  div.id = 'show_review_' + review_id;
  $('code_review').insert(div);
  innerSpan.down('img').observe('click', function(e) {
      var review_id = e.element().up().id.match(/[0-9]+/);
      var target = $('show_review_' + review_id);
      showReview(showReviewUrl, review_id, target);
      
      target.style.top = e.pointerY() + 'px';
      target.style.left = (e.pointerX() + 5) + 'px';
//      var targetBody = target.down('.code_review_body');
//      var maxHeight = (document.viewport.getHeight() * 7) / 10;
//      if (targetBody.getHeight() > maxHeight) {
//          targetBody.setStyle({height: '' + maxHeight + 'px'});
//      }
      
      setDraggables();
      var code_review_body = target.down('.code_review_body');
      var header_table = target.down('.header_table');
      if (isIE6()) {
          code_review_body.setStyle('width: 50%;');
          header_table.setStyle('width: 50%;');
      }
      if (isIE7()) {
          code_review_body.setStyle('width: 500px;');
          header_table.setStyle('width: 500px;');
      }
      Effect.Grow(target.id, {direction: 'top-left'});
          //formPopup(e, $('review-form-frame'));
          //e.preventDefault();
      });
}

function popupReview(line, review_id) {
  var target = $('show_review_' + review_id);
  var span = $('review_' + review_id);

  target.style.top = span.positionedOffset().top + 'px';
  target.style.left = (span.positionedOffset().left + 10) + 'px';
  showReview(showReviewUrl, review_id, target);
  var code_review_body = target.down('.code_review_body');
  var header_table = target.down('.header_table');
  if (isIE6()) { 
      code_review_body.setStyle('width: 50%;');
      header_table.setStyle('width: 50%;');
  }
  if (isIE7()) {
      code_review_body.setStyle('width: 500px;');
      header_table.setStyle('width: 500px;');
  }
  Effect.Grow(target.id, {direction: 'top-left'});
  span.scrollTo();
  setDraggables();
}

function showReview(url, review_id, element) {
    new Ajax.Updater(element, url, {
        asynchronous:false,
        evalScripts:true,
        parameters: 'review_id=' + review_id,
        method:'get'});
    
    element.observe('click', function(e){
        //alert(e.element().inspect());
        toTopLayer(e.element().up('.draggable'));
    });
}

function toTopLayer(element) {
    //alert(element);
    element.setStyle('z-index:' + topZindex + ';');
    topZindex += 10;
}

function formPopup(evt, popup){
    popup.style.top = evt.pointerY() + 'px';
    popup.style.left = (evt.pointerX() + 5) + 'px';
    Effect.Grow(popup.id, {direction: 'top-left'});
    setDraggables();
    toTopLayer(popup);
    
    return false;
}

function hideFrom() {
    alert('aaa');
    $('review-form-frame').style.visibility = false;
}
function addReview(url) {
    //alert('aaa');
    new Ajax.Updater('review-form', url, {asynchronous:false, evalScripts:true, method:'get'});
}

function releaseDraggables() {
    for (var i = 0; i < draggables.length; i++) {
        if (draggables[i] != null) {
            draggables[i].destroy();
        }
    }
    draggables = [];
}

function setDraggables() {
    //alert('here');
    releaseDraggables();
    var list = $$('.draggable');
    for(var i = 0; i < list.length; i++) {
        var draggable = list[i];
        //alert(draggable.inspect());
        var draghandle = draggable.down('.drag-handle');
        if (draghandle == null) {
            continue;
        }
        draggables[i] = new Draggable(draggable, {handle:'drag-handle', zindex: 2000});

    }
}

function deleteReview(review_id) {
    $('show_review_' + review_id).remove();
    $('review_' + review_id).remove();
    setDraggables();
}
