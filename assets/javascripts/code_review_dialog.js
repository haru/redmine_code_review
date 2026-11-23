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

// Popup state. Like in code_review_loader.js these are top-level vars so the
// once-bound document listeners below always reach the current state.
var crDialogZindex = 1000;
var crDialogCount = 0;
var crDialogRecords = new Map();
var crDialogGesture = null;

// Top-level var (not const): the test harness re-runs this classic script per
// test, and only `var` declarations can be re-declared in the same context.
var CR_DIALOG_MIN_SIZE = 150;

/**
 * Reports whether the popup for the content element is open.
 * @param {Element} contentEl - Element shown inside the popup.
 * @returns {boolean} True while the popup is open.
 */
function crIsDialogOpen(contentEl) {
  return crDialogRecords.has(contentEl);
}

/**
 * Brings the popup to the front by assigning the next z-index from the
 * shared counter.
 * @param {Element} frame - Outer frame of the popup.
 */
function crBringToFront(frame) {
  crDialogZindex += 1;
  frame.style.zIndex = String(crDialogZindex);
}

/**
 * Centers the popup in the window, honoring the scroll position.
 * @param {Element} frame - Outer frame of the popup.
 */
function crCenterDialog(frame) {
  const width = parseFloat(frame.style.width);
  const left = window.scrollX + (window.innerWidth - width) / 2;
  const top = window.scrollY + (window.innerHeight - frame.offsetHeight) / 2;
  frame.style.left = Math.max(window.scrollX, left) + 'px';
  frame.style.top = Math.max(window.scrollY, top) + 'px';
}

/**
 * Opens the popup for the content element: wraps it in the outer frame and
 * appends the frame at the end of #content. When the popup is already open
 * it is only brought to the front (an `onClose` given here is ignored).
 * @param {Element} contentEl - Element to show inside the popup.
 * @param {{title?: string, width?: number, onClose?: function()}=} options
 *   `onClose` is called once when the popup is closed, from any path.
 * @returns {Element} The outer frame.
 */
function crOpenDialog(contentEl, options) {
  const existing = crDialogRecords.get(contentEl);
  if (existing) {
    crBringToFront(existing.frame);
    return existing.frame;
  }
  return crCreateDialog(contentEl, options || {});
}

/**
 * Builds the popup frame around the content element and wires its handlers.
 * @param {Element} contentEl - Element to show inside the popup.
 * @param {{title?: string, width?: number, onClose?: function()}} options - See crOpenDialog.
 * @returns {Element} The outer frame.
 */
function crCreateDialog(contentEl, options) {
  // Look the container up first: nothing may change when it is missing.
  const container = document.getElementById('content');
  if (!container) {
    throw new Error('code_review: #content not found, cannot open the popup');
  }
  // The placeholder keeps the content's original position, so popups can be
  // closed in any order (a remembered sibling may have moved into a popup).
  const placeholder = document.createComment('cr-dialog');
  contentEl.before(placeholder);
  crDialogCount += 1;
  const title = document.createElement('span');
  title.className = 'cr-dialog-title';
  title.id = 'cr-dialog-title-' + crDialogCount;
  title.textContent = options.title == null ? '' : options.title;
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'cr-dialog-close';
  close.title = 'Close';
  close.setAttribute('aria-label', 'Close');
  close.textContent = '×';
  const titlebar = document.createElement('div');
  titlebar.className = 'cr-dialog-titlebar';
  titlebar.append(title, close);
  const content = document.createElement('div');
  content.className = 'cr-dialog-content';
  content.append(contentEl);
  const frame = document.createElement('div');
  frame.className = 'cr-dialog';
  frame.setAttribute('role', 'dialog');
  frame.setAttribute('aria-labelledby', title.id);
  frame.append(titlebar, content, ...crCreateDialogHandles());
  crDialogRecords.set(contentEl, { frame, contentEl, placeholder, onClose: options.onClose });
  contentEl.style.display = '';
  frame.style.width = (options.width || 640) + 'px';
  container.append(frame);
  crCenterDialog(frame);
  crBringToFront(frame);
  close.addEventListener('click', () => crCloseDialog(contentEl));
  frame.addEventListener('pointerdown', () => crBringToFront(frame));
  titlebar.addEventListener('pointerdown', (event) => crStartDialogDrag(frame, event));
  for (const handle of frame.querySelectorAll('.cr-dialog-handle')) {
    handle.addEventListener('pointerdown', (event) => crStartDialogResize(frame, event));
  }
  return frame;
}

/**
 * Builds the eight resize handles in their fixed order.
 * @returns {Element[]} The handles, one per direction.
 */
function crCreateDialogHandles() {
  return ['n', 'e', 's', 'w', 'ne', 'nw', 'se', 'sw'].map((dir) => {
    const handle = document.createElement('div');
    handle.className = 'cr-dialog-handle';
    handle.setAttribute('data-cr-dir', dir);
    return handle;
  });
}

/**
 * Returns the record of the popup with the highest z-index.
 * @returns {{frame: Element, contentEl: Element, placeholder: Comment, onClose: (function()|undefined)}}
 *   The topmost record; only call it while a popup is open.
 */
function crTopmostDialog() {
  return [...crDialogRecords.values()].reduce((top, record) =>
    Number(record.frame.style.zIndex) > Number(top.frame.style.zIndex) ? record : top);
}

/**
 * Closes the popup of the content element: removes the frame, restores the
 * content element to its original parent and position, hides it, and calls
 * `onClose`. Doing nothing when the popup is not open makes double-close safe.
 * @param {Element} contentEl - Element shown inside the popup.
 */
function crCloseDialog(contentEl) {
  const record = crDialogRecords.get(contentEl);
  if (!record) {
    return;
  }
  crDialogRecords.delete(contentEl);
  record.frame.remove();
  record.placeholder.replaceWith(contentEl);
  contentEl.style.display = 'none';
  if (record.onClose) {
    record.onClose();
  }
}

/**
 * Closes the topmost popup on Escape; without an open popup, Escape is ignored.
 * Escape that cancels an IME composition or was already handled is left alone,
 * so the text typed in the popup is not lost.
 * @param {KeyboardEvent} event - The keydown event.
 */
function crOnDialogKeydown(event) {
  if (event.key !== 'Escape' || event.isComposing || event.defaultPrevented ||
      crDialogRecords.size === 0) {
    return;
  }
  crCloseDialog(crTopmostDialog().contentEl);
}

/**
 * Starts a pointer gesture (drag or resize) on the popup, remembering the
 * start position and size and capturing the pointer on the gesture element.
 * @param {Element} frame - Outer frame of the popup.
 * @param {PointerEvent} event - The pointerdown that starts the gesture.
 * @param {string|null} dir - Resize handle direction, or null to drag the popup.
 */
function crBeginDialogGesture(frame, event, dir) {
  event.preventDefault();
  const rect = frame.getBoundingClientRect();
  crDialogGesture = {
    frame,
    dir,
    pointerId: event.pointerId,
    clientX: event.clientX,
    clientY: event.clientY,
    left: parseFloat(frame.style.left),
    top: parseFloat(frame.style.top),
    width: rect.width,
    height: rect.height,
    capture: event.currentTarget,
  };
  event.currentTarget.setPointerCapture(event.pointerId);
}

/**
 * Maps a drag delta to a move of the whole popup, kept from leaving the top/left edge of the
 * document (the page grows to the right/bottom, so the titlebar stays reachable).
 * @param {object} start - Gesture state captured at pointerdown.
 * @param {number} dx - Horizontal pointer delta.
 * @param {number} dy - Vertical pointer delta.
 * @returns {{left: number, top: number, width: number, height: number}} New geometry.
 */
function crApplyDialogDrag(start, dx, dy) {
  return {
    left: Math.max(0, start.left + dx),
    top: Math.max(0, start.top + dy),
    width: start.width,
    height: start.height,
  };
}

/**
 * Starts dragging the popup by its titlebar (the close button does not drag).
 * @param {Element} frame - Outer frame of the popup.
 * @param {PointerEvent} event - The pointerdown on the titlebar.
 */
function crStartDialogDrag(frame, event) {
  if (event.target.closest('.cr-dialog-close')) {
    return;
  }
  crBeginDialogGesture(frame, event, null);
}

/**
 * Maps a drag delta to a resize in the handle's direction(s); north/west edges
 * move the popup, and the popup never shrinks below CR_DIALOG_MIN_SIZE.
 * @param {string} dir - Handle direction (`n`, `se`, `nw`, ...).
 * @param {object} start - Gesture state captured at pointerdown.
 * @param {number} dx - Horizontal pointer delta.
 * @param {number} dy - Vertical pointer delta.
 * @returns {{left: number, top: number, width: number, height: number}} New geometry.
 */
function crApplyDialogResize(dir, start, dx, dy) {
  let left = start.left;
  let top = start.top;
  let width = start.width;
  let height = start.height;
  if (dir.includes('e')) {
    width = start.width + dx;
  }
  if (dir.includes('w')) {
    width = start.width - dx;
    left = start.left + dx;
  }
  if (dir.includes('s')) {
    height = start.height + dy;
  }
  if (dir.includes('n')) {
    height = start.height - dy;
    top = start.top + dy;
  }
  if (width < CR_DIALOG_MIN_SIZE) {
    width = CR_DIALOG_MIN_SIZE;
    if (dir.includes('w')) {
      left = start.left + start.width - CR_DIALOG_MIN_SIZE;
    }
  }
  if (height < CR_DIALOG_MIN_SIZE) {
    height = CR_DIALOG_MIN_SIZE;
    if (dir.includes('n')) {
      top = start.top + start.height - CR_DIALOG_MIN_SIZE;
    }
  }
  return { left, top, width, height };
}

/**
 * Starts resizing the popup from a size handle.
 * @param {Element} frame - Outer frame of the popup.
 * @param {PointerEvent} event - The pointerdown on the handle.
 */
function crStartDialogResize(frame, event) {
  crBeginDialogGesture(frame, event, event.currentTarget.getAttribute('data-cr-dir'));
}

/**
 * Applies the pointer delta of an active gesture to the popup.
 * @param {PointerEvent} event - The pointermove event.
 */
function crOnDialogPointerMove(event) {
  const gesture = crDialogGesture;
  if (!gesture || gesture.pointerId !== event.pointerId) {
    return;
  }
  const dx = event.clientX - gesture.clientX;
  const dy = event.clientY - gesture.clientY;
  const pos = gesture.dir === null
    ? crApplyDialogDrag(gesture, dx, dy)
    : crApplyDialogResize(gesture.dir, gesture, dx, dy);
  crDialogGesture.frame.style.left = pos.left + 'px';
  crDialogGesture.frame.style.top = pos.top + 'px';
  crDialogGesture.frame.style.width = pos.width + 'px';
  crDialogGesture.frame.style.height = pos.height + 'px';
}

/**
 * Ends the active gesture and releases the captured pointer.
 * @param {PointerEvent} event - The pointerup or pointercancel event.
 */
function crOnDialogPointerUp(event) {
  if (!crDialogGesture || crDialogGesture.pointerId !== event.pointerId) {
    return;
  }
  crDialogGesture.capture.releasePointerCapture(event.pointerId);
  crDialogGesture = null;
}

// The Esc and pointer listeners are bound exactly once; re-running the script
// (tests) must not duplicate them.
if (!globalThis.crDialogListenersBound) {
  globalThis.crDialogListenersBound = true;
  document.addEventListener('keydown', crOnDialogKeydown);
  document.addEventListener('pointermove', crOnDialogPointerMove);
  document.addEventListener('pointerup', crOnDialogPointerUp);
  document.addEventListener('pointercancel', crOnDialogPointerUp);
}
