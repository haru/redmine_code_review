import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadClassicScripts, flushReady } from './support/load_classic_script.js';

describe('dialog open/close', () => {
  beforeEach(async () => {
    document.body.innerHTML = '<div id="content"></div>';
    loadClassicScripts();
    await flushReady();
  });

  const makeContent = (id) => {
    const el = document.createElement('div');
    el.id = id;
    document.getElementById('content').append(el);
    return el;
  };

  const dialogOf = (contentEl) => contentEl.closest('.cr-dialog');

  const openDialog = (id, options) => {
    const contentEl = makeContent(id);
    crOpenDialog(contentEl, options);
    return contentEl;
  };

  const stubWindow = (values) => {
    const names = { width: 'innerWidth', height: 'innerHeight' };
    for (const [prop, value] of Object.entries(values)) {
      Object.defineProperty(window, names[prop] || prop, { configurable: true, value });
    }
  };

  const pressEscape = () =>
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

  describe('crOpenDialog', () => {
    it('wraps the content element in a dialog appended at the end of #content', () => {
      const contentEl = openDialog('the-content', { title: 'Add review' });

      const frame = dialogOf(contentEl);
      expect(frame).not.toBeNull();
      expect(frame.getAttribute('role')).toBe('dialog');
      expect(frame.parentElement.id).toBe('content');
      expect(document.getElementById('content').lastElementChild).toBe(frame);
      expect(frame.querySelector('.cr-dialog-content').contains(contentEl)).toBe(true);

      const title = frame.querySelector('.cr-dialog-title');
      expect(title.textContent).toBe('Add review');
      expect(frame.getAttribute('aria-labelledby')).toBe(title.id);

      const close = frame.querySelector('.cr-dialog-close');
      expect(close.tagName).toBe('BUTTON');
      expect(close.getAttribute('aria-label')).toBe('Close');

      expect(frame.querySelectorAll('.cr-dialog-handle')).toHaveLength(8);
      expect([...frame.querySelectorAll('.cr-dialog-handle')].map((h) => h.dataset.crDir))
        .toEqual(['n', 'e', 's', 'w', 'ne', 'nw', 'se', 'sw']);
    });

    it('throws and changes nothing when #content is missing', () => {
      const contentEl = makeContent('c1');
      const parent = contentEl.parentElement;
      parent.id = 'elsewhere';

      expect(() => crOpenDialog(contentEl, {})).toThrowError(/#content not found/);

      expect(crIsDialogOpen(contentEl)).toBe(false);
      expect(contentEl.parentElement).toBe(parent);
      expect(parent.childNodes).toHaveLength(1);
    });

    it('opens with width 640px centered in the window', () => {
      stubWindow({ width: 1000, height: 800 });

      const frame = dialogOf(openDialog('c1', {}));

      expect(frame.style.width).toBe('640px');
      expect(frame.style.left).toBe('180px');
      expect(frame.style.top).toBe('400px');
    });

    it('takes the scroll position into account when centering', () => {
      stubWindow({ width: 1000, height: 800, scrollX: 100, scrollY: 50 });

      const frame = dialogOf(openDialog('c1', {}));

      expect(frame.style.left).toBe('280px');
      expect(frame.style.top).toBe('450px');
    });

    it('honors a custom width', () => {
      stubWindow({ width: 800, height: 600 });

      const frame = dialogOf(openDialog('c1', { width: 500 }));

      expect(frame.style.width).toBe('500px');
    });

    it('brings an already open dialog to the front without recreating it', () => {
      stubWindow({ width: 1000, height: 800 });
      const contentEl = openDialog('c1', { title: 'First' });
      const frame = dialogOf(contentEl);
      const zIndexBefore = frame.style.zIndex;

      const returned = crOpenDialog(contentEl, { title: 'Second' });

      expect(returned).toBe(frame);
      expect(document.querySelectorAll('.cr-dialog')).toHaveLength(1);
      expect(frame.style.zIndex).toBe(String(Number(zIndexBefore) + 1));
      expect(frame.querySelector('.cr-dialog-title').textContent).toBe('First');
    });
  });

  describe('crCloseDialog', () => {
    it('restores the content element to its original place and hides it', () => {
      const parent = document.createElement('div');
      const sibling = document.createElement('span');
      parent.append(sibling);
      document.getElementById('content').append(parent);
      const contentEl = document.createElement('div');
      parent.append(sibling, contentEl);

      crOpenDialog(contentEl, {});
      crCloseDialog(contentEl);

      expect(document.querySelector('.cr-dialog')).toBeNull();
      expect(contentEl.parentElement).toBe(parent);
      expect(parent.lastElementChild).toBe(contentEl);
      expect(contentEl.style.display).toBe('none');
    });

    it('restores every content element when popups are closed in the order they were opened', () => {
      const parent = document.getElementById('content');
      const first = openDialog('first', {});
      const second = openDialog('second', {});

      crCloseDialog(first);
      crCloseDialog(second);

      expect(document.querySelector('.cr-dialog')).toBeNull();
      expect([...parent.children].map((el) => el.id)).toEqual(['first', 'second']);
      expect(first.style.display).toBe('none');
      expect(crIsDialogOpen(first)).toBe(false);
      crOpenDialog(first, {});
      expect(crIsDialogOpen(first)).toBe(true);
    });

    it('is safe to call twice and calls onClose once', () => {
      const onClose = vi.fn();
      const contentEl = openDialog('c1', { onClose });

      crCloseDialog(contentEl);
      crCloseDialog(contentEl);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does nothing when the dialog is not open', () => {
      const contentEl = makeContent('c1');

      expect(() => crCloseDialog(contentEl)).not.toThrow();
    });
  });

  describe('crIsDialogOpen', () => {
    it('follows the open state', () => {
      const contentEl = makeContent('c1');

      expect(crIsDialogOpen(contentEl)).toBe(false);

      crOpenDialog(contentEl, {});
      expect(crIsDialogOpen(contentEl)).toBe(true);

      crCloseDialog(contentEl);
      expect(crIsDialogOpen(contentEl)).toBe(false);
    });
  });

  describe('closing paths', () => {
    it.each([
      ['the close button', (frame) => frame.querySelector('.cr-dialog-close').click()],
      ['Escape', () => pressEscape()],
    ])('closes through %s and calls onClose exactly once', (_label, close) => {
      const onClose = vi.fn();
      const contentEl = makeContent('c1');
      const parent = contentEl.parentElement;
      crOpenDialog(contentEl, { onClose });

      close(dialogOf(contentEl));

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(crIsDialogOpen(contentEl)).toBe(false);
      expect(contentEl.parentElement).toBe(parent);
      expect(contentEl.style.display).toBe('none');
    });
  });

  describe('Escape', () => {
    it('closes only the topmost dialog of several', () => {
      const first = openDialog('first', {});
      const second = openDialog('second', {});

      pressEscape();

      expect(crIsDialogOpen(second)).toBe(false);
      expect(crIsDialogOpen(first)).toBe(true);
      expect(dialogOf(first)).not.toBeNull();
    });

    it('does nothing when no dialog is open', () => {
      expect(() => pressEscape()).not.toThrow();
    });

    it.each([
      ['an IME composition', { isComposing: true }],
      ['an event another handler already handled', { cancelable: true, prevent: true }],
    ])('leaves the dialog open for Escape that belongs to %s', (_label, { prevent, ...init }) => {
      const contentEl = openDialog('c1', {});
      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, ...init });
      if (prevent) {
        event.preventDefault();
      }

      document.dispatchEvent(event);

      expect(crIsDialogOpen(contentEl)).toBe(true);
    });
  });

  it('brings a dialog to the front on pointerdown', () => {
    const firstFrame = dialogOf(openDialog('first', {}));
    const secondFrame = dialogOf(openDialog('second', {}));

    firstFrame.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));

    expect(Number(firstFrame.style.zIndex)).toBeGreaterThan(Number(secondFrame.style.zIndex));
  });
});
