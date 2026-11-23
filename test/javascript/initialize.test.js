import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadClassicScripts, flushReady } from './support/load_classic_script.js';

describe('crInitialize', () => {
  beforeEach(async () => {
    document.body.innerHTML = '<div id="content"></div>';
    loadClassicScripts();
    await flushReady();
  });

  const marker = (html) => {
    document.getElementById('content').innerHTML = html;
    return document.getElementById('content').firstElementChild;
  };

  it('initializes every marker once and removes the attribute first', () => {
    const initialized = vi.fn();
    crRegisterInit('thing', initialized);
    const el = marker('<div data-cr-init="thing" data-cr-name="a"></div><div data-cr-init="thing"></div>');

    crInitialize(document.getElementById('content'));

    expect(initialized).toHaveBeenCalledTimes(2);
    expect(initialized).toHaveBeenCalledWith(el);
    expect(el.hasAttribute('data-cr-init')).toBe(false);
  });

  it('never initializes the same element twice', () => {
    crRegisterInit('thing', vi.fn());
    const el = marker('<div data-cr-init="thing"></div>');
    crInitialize(document.getElementById('content'));

    crInitialize(document.getElementById('content'));

    expect(document.querySelectorAll('[data-cr-init]')).toHaveLength(0);
    expect(el.dataset.crInit).toBeUndefined();
  });

  it('throws when the name is not registered', () => {
    marker('<div data-cr-init="unknown"></div>');

    expect(() => crInitialize(document.getElementById('content')))
      .toThrowError(/unknown/);
  });

  it('does nothing on a page without markers', () => {
    document.getElementById('content').innerHTML = '<div class="plain"></div>';

    expect(() => crInitialize(document.getElementById('content'))).not.toThrow();
  });

  it('initializes markers of the page on DOMContentLoaded', () => {
    // Emulate the browser order: the script loads while the document is still
    // parsing, so the page initialization waits for DOMContentLoaded.
    Object.defineProperty(document, 'readyState', { configurable: true, value: 'loading' });
    loadClassicScripts();
    const initialized = vi.fn();
    crRegisterInit('page-init', initialized);
    marker('<div data-cr-init="page-init"></div>');

    document.dispatchEvent(new Event('DOMContentLoaded'));
    delete document.readyState;

    expect(initialized).toHaveBeenCalledTimes(1);
  });

  describe('attribute readers', () => {
    const readWith = (reader, html) => {
      crRegisterInit('reader', (el) => markerValues.push(reader(el)));
      const values = markerValues;
      marker(html);
      crInitialize(document.getElementById('content'));
      return values;
    };
    let markerValues;

    beforeEach(() => {
      markerValues = [];
    });

    it('crAttr returns a required string attribute', () => {
      const values = readWith((el) => crAttr(el, 'data-cr-url'), '<div data-cr-init="reader" data-cr-url="/x"></div>');

      expect(values).toEqual(['/x']);
    });

    it('crAttr names the missing attribute in the error', () => {
      expect(() => readWith((el) => crAttr(el, 'data-cr-url'), '<div data-cr-init="reader"></div>'))
        .toThrowError(/data-cr-url/);
    });

    it('crAttrJson parses a JSON attribute', () => {
      const values = readWith((el) => crAttrJson(el, 'data-cr-reviews'), '<div data-cr-init="reader" data-cr-reviews="[1,2]"></div>');

      expect(values).toEqual([[1, 2]]);
    });

    it('crAttrJson names the attribute when the JSON is invalid', () => {
      expect(() => readWith((el) => crAttrJson(el, 'data-cr-reviews'), '<div data-cr-init="reader" data-cr-reviews="{nope"></div>'))
        .toThrowError(/data-cr-reviews/);
    });

    it('crAttrJson names the attribute when it is missing', () => {
      expect(() => readWith((el) => crAttrJson(el, 'data-cr-reviews'), '<div data-cr-init="reader"></div>'))
        .toThrowError(/data-cr-reviews/);
    });

    it.each([
      ['true', true],
      ['false', false],
    ])('crAttrBool parses "%s"', (value, expected) => {
      const values = readWith((el) => crAttrBool(el, 'data-cr-diff'), `<div data-cr-init="reader" data-cr-diff="${value}"></div>`);

      expect(values).toEqual([expected]);
    });

    it('crAttrBool rejects anything but "true" / "false"', () => {
      expect(() => readWith((el) => crAttrBool(el, 'data-cr-diff'), '<div data-cr-init="reader" data-cr-diff="yes"></div>'))
        .toThrowError(/data-cr-diff/);
    });

    it('crAttrInt parses an integer attribute', () => {
      const values = readWith((el) => crAttrInt(el, 'data-cr-line'), '<div data-cr-init="reader" data-cr-line="12"></div>');

      expect(values).toEqual([12]);
    });

    it.each(['abc', '1.5', ''])('crAttrInt rejects "%s" instead of passing NaN on', (value) => {
      expect(() => readWith((el) => crAttrInt(el, 'data-cr-line'), `<div data-cr-init="reader" data-cr-line="${value}"></div>`))
        .toThrowError(/data-cr-line/);
    });

    it('crQuery names the selector when nothing matches', () => {
      expect(() => crQuery('#nope')).toThrowError(/"#nope" matches no element/);
    });

    it('crAttrBool names the attribute when it is missing', () => {
      expect(() => readWith((el) => crAttrBool(el, 'data-cr-diff'), '<div data-cr-init="reader"></div>'))
        .toThrowError(/data-cr-diff/);
    });
  });
});
