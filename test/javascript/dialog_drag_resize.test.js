import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadClassicScripts, flushReady } from './support/load_classic_script.js';

describe('dialog drag & resize', () => {
  beforeEach(async () => {
    document.body.innerHTML = '<div id="content"></div>';
    // jsdom has no layout: give the gesture code something to read. The frame
    // is 640x400 at 100/100 (matching the style set below).
    Object.defineProperty(document.documentElement, 'scrollWidth', { configurable: true, value: 2000 });
    Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: 1000 });
    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();

    loadClassicScripts();
    await flushReady();
  });

  const stubFrameRect = (frame) => {
    vi.spyOn(frame, 'getBoundingClientRect').mockReturnValue({
      left: 100, top: 100, width: 640, height: 400,
    });
  };

  const fire = (target, type, [clientX, clientY]) => {
    const Ctor = window.PointerEvent || MouseEvent;
    target.dispatchEvent(new Ctor(type, {
      bubbles: true, cancelable: true, button: 0, pointerId: 1, clientX, clientY,
    }));
  };

  const openAt = () => {
    const contentEl = document.createElement('div');
    document.getElementById('content').append(contentEl);
    const frame = crOpenDialog(contentEl, {});
    frame.style.left = '100px';
    frame.style.top = '100px';
    stubFrameRect(frame);
    return frame;
  };

  const drag = (from, to) => {
    fire(document.querySelector('.cr-dialog-titlebar'), 'pointerdown', from);
    fire(document.querySelector('.cr-dialog-titlebar'), 'pointermove', to);
  };

  describe('dragging by the titlebar', () => {
    it('moves the dialog with the pointer', () => {
      const frame = openAt();

      drag([200, 200], [250, 230]);

      expect(frame.style.left).toBe('150px');
      expect(frame.style.top).toBe('130px');
      expect(frame.style.width).toBe('640px');
    });

    it('keeps the dialog from leaving the top/left edge of the document', () => {
      const frame = openAt();

      drag([200, 200], [-9000, -9000]);

      expect(frame.style.left).toBe('0px');
      expect(frame.style.top).toBe('0px');
    });

    it('stops following the pointer after pointercancel', () => {
      const frame = openAt();

      fire(document.querySelector('.cr-dialog-titlebar'), 'pointerdown', [200, 200]);
      fire(document, 'pointercancel', [200, 200]);
      fire(document, 'pointermove', [300, 300]);

      expect(frame.style.left).toBe('100px');
      expect(frame.style.top).toBe('100px');
    });

    it('ignores the moves of another pointer', () => {
      const frame = openAt();
      const Ctor = window.PointerEvent || MouseEvent;

      fire(document.querySelector('.cr-dialog-titlebar'), 'pointerdown', [200, 200]);
      document.dispatchEvent(new Ctor('pointermove', { pointerId: 2, clientX: 300, clientY: 300 }));

      expect(frame.style.left).toBe('100px');
    });

    it('does not drag from the close button', () => {
      const frame = openAt();

      const close = frame.querySelector('.cr-dialog-close');
      fire(close, 'pointerdown', [200, 200]);
      fire(close, 'pointermove', [260, 240]);

      expect(frame.style.left).toBe('100px');
      expect(frame.style.top).toBe('100px');
    });

    it('stops moving after pointerup', () => {
      const frame = openAt();

      drag([200, 200], [250, 230]);
      fire(document.querySelector('.cr-dialog-titlebar'), 'pointerup', [250, 230]);
      fire(document.querySelector('.cr-dialog-titlebar'), 'pointermove', [400, 400]);

      expect(frame.style.left).toBe('150px');
      expect(frame.style.top).toBe('130px');
    });
  });

  describe('resizing by the handles', () => {
    // Start: 640x400 at 100/100. Deltas are applied to the dragged handle.
    it.each([
      ['n', [0, -40], { left: 100, top: 60, width: 640, height: 440 }],
      ['e', [100, 0], { left: 100, top: 100, width: 740, height: 400 }],
      ['s', [0, 50], { left: 100, top: 100, width: 640, height: 450 }],
      ['w', [-30, 0], { left: 70, top: 100, width: 670, height: 400 }],
      ['ne', [100, -40], { left: 100, top: 60, width: 740, height: 440 }],
      ['nw', [-30, -40], { left: 70, top: 60, width: 670, height: 440 }],
      ['se', [100, 50], { left: 100, top: 100, width: 740, height: 450 }],
      ['sw', [-30, 50], { left: 70, top: 100, width: 670, height: 450 }],
    ])('%s handle resizes (and moves for n/w)', (dir, [dx, dy], expected) => {
      const frame = openAt();

      const handle = frame.querySelector(`.cr-dialog-handle[data-cr-dir="${dir}"]`);
      fire(handle, 'pointerdown', [200, 200]);
      fire(handle, 'pointermove', [200 + dx, 200 + dy]);

      expect(frame.style.left).toBe(`${expected.left}px`);
      expect(frame.style.top).toBe(`${expected.top}px`);
      expect(frame.style.width).toBe(`${expected.width}px`);
      expect(frame.style.height).toBe(`${expected.height}px`);
    });

    it('never shrinks below 150x150', () => {
      const frame = openAt();

      const handle = frame.querySelector('.cr-dialog-handle[data-cr-dir="se"]');
      fire(handle, 'pointerdown', [200, 200]);
      fire(handle, 'pointermove', [200 - 1000, 200 - 1000]);

      expect(frame.style.width).toBe('150px');
      expect(frame.style.height).toBe('150px');
    });

    it('keeps position when the west/north minimum is reached', () => {
      const frame = openAt();

      const handle = frame.querySelector('.cr-dialog-handle[data-cr-dir="nw"]');
      fire(handle, 'pointerdown', [200, 200]);
      fire(handle, 'pointermove', [200 + 1000, 200 + 1000]);

      expect(frame.style.left).toBe('590px');
      expect(frame.style.top).toBe('350px');
      expect(frame.style.width).toBe('150px');
      expect(frame.style.height).toBe('150px');
    });

    it('stops resizing after pointerup', () => {
      const frame = openAt();

      const handle = frame.querySelector('.cr-dialog-handle[data-cr-dir="se"]');
      fire(handle, 'pointerdown', [200, 200]);
      fire(handle, 'pointermove', [300, 300]);
      fire(handle, 'pointerup', [300, 300]);
      fire(handle, 'pointermove', [500, 500]);

      expect(frame.style.width).toBe('740px');
    });
  });
});
