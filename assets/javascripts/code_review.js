var draggables = [];

function setAddReviewButton(url, change_id, image_tag, is_readonly){
  var trs = $$('table.filecontent tr');
  trs.each(function(tr){
      th = tr.down('th', 1);
      if (th == undefined) {
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
  $('content').insert(div);
  innerSpan.down('img').observe('click', function(e) {
      var review_id = e.element().up().id.match(/[0-9]+/);
      var target = $('show_review_' + review_id);
      showReview(showReviewUrl, review_id, target);
      target.style.top = e.pointerY() + 'px';
      target.style.left = (e.pointerX() + 5) + 'px';
      Effect.Grow(target.id, {direction: 'top-left'});
      setDraggables();
          //formPopup(e, $('review-form-frame'));
          //e.preventDefault();
      });
}

function showReview(url, review_id, element) {
    new Ajax.Updater(element, url, {
        asynchronous:false,
        evalScripts:true,
        parameters: 'review_id=' + review_id,
        method:'get'});
}

function formPopup(evt, popup){
    popup.style.top = evt.pointerY() + 'px';
    popup.style.left = (evt.pointerX() + 5) + 'px';
    Effect.Grow(popup.id, {direction: 'top-left'});
    setDraggables();
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
        draggables[i].destroy();
    }
    draggables = [];
}

function setDraggables() {
    releaseDraggables();
    var list = $$('.draggable');
    for(var i = 0; i < list.length; i++) {
        var draggable = list[i];
        //alert(draggable.inspect());
        var draghandle = draggable.down('.drag-handle');
        if (draghandle == null) {
            continue;
        }
        draggables[i] = new Draggable(draggable, {handle:'drag-handle'});

    }
}

function deleteReview(review_id) {
    $('show_review_' + review_id).remove();
    $('review_' + review_id).remove();
    setDraggables();
}
