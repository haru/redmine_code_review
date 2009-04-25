var draggables = [];

function setAddReviewButton(url, change_id, image_tag){
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
      span.insert(image_tag);
      th.insert(span);
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

function setShowReviewButton(url, line, review_id, image_tag) {
  var span = $('review_span_' + line);
  var innerSpan = new Element('span');
  //alert('review_id = ' + review_id);
  innerSpan.id = 'review_' + review_id;
  span.insert(innerSpan);
  innerSpan.innerHTML = image_tag;
  var div = new Element('div', {style:'position:absolute; display:none;', 'class':'draggable'});
  div.id = 'show_review_' + review_id;
  $('content').insert(div);
  innerSpan.down('img').observe('click', function(e) {
      var review_id = e.element().up().id.match(/[0-9]+/);
      var target = $('show_review_' + review_id);
      showReview(url, review_id, target);
      target.style.top = e.pointerY() + 'px';
      target.style.left = (e.pointerX() + 5) + 'px';
      Effect.Grow(target.id, {direction: 'top-left'});
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
    return false;
}

function hideFrom() {
    alert('aaa');
    $('review-form-frame').style.visibility = false;
}
function addReview(url) {
    //alert('aaa');
    new Ajax.Updater('review-form', url, {asynchronous:true, evalScripts:true, method:'get'});    
}

function releaseDraggables() {
    for (var i = 0; i < draggables.length; i++) {
        draggables[i].remove();
    }
    draggables = [];
}

function setDraggables() {
    releaseDraggables();
    var list = $$('.draggable');
    for(var i = 0; i < list.length; i++) {
        draggables[i] = new Draggable(list[i]);
    }
}

