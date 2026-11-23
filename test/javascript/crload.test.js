import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadClassicScripts, flushReady } from './support/load_classic_script.js';

describe('crLoad', () => {
  beforeEach(async () => {
    document.body.innerHTML = `
      <meta name="csrf-token" content="TOKEN123">
      <div id="target"><p class="keep">old content</p></div>`;
    loadClassicScripts();
    await flushReady();
  });

  const target = () => document.getElementById('target');

  const respondWith = (html, init = {}) => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(html, init));
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  };

  const failWithNetwork = () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  };

  const call = (url = '/load', options = { method: 'GET' }) =>
    crLoad(target(), url, options);

  it('returns a promise that resolves after the response is shown', async () => {
    respondWith('<p class="new">loaded</p>');

    const result = call();
    expect(result).toBeInstanceOf(Promise);
    await result;

    expect(target().textContent).toBe('loaded');
  });

  it('sends X-Requested-With and replaces the target content on GET', async () => {
    const fetchMock = respondWith('<p class="new">loaded</p>');

    await call('/load?a=1');

    expect(fetchMock).toHaveBeenCalledWith('/load?a=1', {
      method: 'GET',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
      body: null,
    });
    expect(target().querySelector('.new')).not.toBeNull();
    expect(target().querySelector('.keep')).toBeNull();
  });

  it.each([
    ['plain object', { a: '1', b: 'x y' }, 'a=1&b=x+y'],
    ['URLSearchParams', new URLSearchParams({ a: '1', b: 'x y' }), 'a=1&b=x+y'],
    ['FormData', (() => { const fd = new FormData(); fd.append('a', '1'); fd.append('b', 'x y'); return fd; })(), 'a=1&b=x+y'],
  ])('encodes %s params into the query string on GET', async (_label, params, query) => {
    const fetchMock = respondWith('');

    await call('/load', { method: 'GET', params });

    expect(fetchMock.mock.calls[0][0]).toBe(`/load?${query}`);
  });

  it('omits the query string when GET has no params', async () => {
    const fetchMock = respondWith('');

    await call('/load', { method: 'GET' });

    expect(fetchMock.mock.calls[0][0]).toBe('/load');
  });

  it('sends the CSRF token and urlencoded params as the body on POST', async () => {
    const fetchMock = respondWith('');

    await call('/load', { method: 'POST', params: { a: '1', b: 'x y' } });

    const [, options] = fetchMock.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(options.body).toBe('a=1&b=x+y');
    expect(options.headers).toEqual({
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRF-Token': 'TOKEN123',
      'Content-Type': 'application/x-www-form-urlencoded',
    });
  });

  it('sends no CSRF header when the page has no token (forgery protection off)', async () => {
    document.querySelector('meta[name="csrf-token"]').remove();
    const fetchMock = respondWith('');

    await call('/load', { method: 'POST', params: { a: '1' } });

    expect(fetchMock.mock.calls[0][1].headers).toEqual({
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/x-www-form-urlencoded',
    });
  });

  it.each([
    ['null', () => null],
    ['a selector string', () => '#target'],
  ])('rejects before sending anything when the target is %s', async (_label, makeTarget) => {
    const fetchMock = respondWith('');

    await expect(crLoad(makeTarget(), '/load', { method: 'POST' }))
      .rejects.toThrowError(/target must be an element/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows the error and rethrows when the loaded fragment fails to initialize', async () => {
    respondWith('<div data-cr-init="no-such-init"></div>');

    await expect(call()).rejects.toThrowError(/unregistered init "no-such-init"/);

    expect(target().querySelector('.cr-load-error').textContent).toMatch(/no-such-init/);
  });

  it('shows the error when the response body cannot be read', async () => {
    const broken = { ok: true, text: () => Promise.reject(new TypeError('body stream broke')) };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(broken));

    await call();

    expect(target().querySelector('.keep')).not.toBeNull();
    expect(target().firstElementChild.textContent).toBe('body stream broke');
  });

  it.each([
    ['missing method', { params: {} }],
    ['unsupported method', { method: 'PUT' }],
  ])('throws on %s', async (_label, options) => {
    await expect(call('/load', options)).rejects.toThrowError(/method/);
  });

  it('executes scripts contained in the response fragment', async () => {
    respondWith('<p class="new">ok</p><script>window.__crloadRan = "executed";</script>');

    await call();

    // vitest populates the worker global as `window`, while inserted fragment
    // scripts evaluate in the jsdom window itself (reachable via global.jsdom).
    expect(window.jsdom.window.__crloadRan).toBe('executed');
  });

  it('runs crInitialize on the target after insertion', async () => {
    respondWith('<div data-cr-init="loaded-init"></div>');
    const initialized = vi.fn();
    crRegisterInit('loaded-init', initialized);

    await call();

    expect(initialized).toHaveBeenCalledTimes(1);
    expect(initialized.mock.calls[0][0].dataset.crInit).toBeUndefined();
  });

  it('keeps the content and shows the HTTP status on an HTTP error', async () => {
    respondWith('<p>ignored</p>', { status: 500, statusText: 'Internal Server Error' });

    await call();

    expect(target().querySelector('.keep')).not.toBeNull();
    expect(target().querySelector('.new')).toBeNull();
    const flash = target().firstElementChild;
    expect(flash.className).toBe('flash error cr-load-error');
    expect(flash.textContent).toBe('500 Internal Server Error');
  });

  it('replaces a previous error instead of stacking them', async () => {
    respondWith('', { status: 404, statusText: 'Not Found' });
    await call();
    respondWith('', { status: 403, statusText: 'Forbidden' });
    await call();

    expect(target().querySelectorAll('.cr-load-error')).toHaveLength(1);
    expect(target().firstElementChild.textContent).toBe('403 Forbidden');
  });

  it('shows the error message when the request itself fails', async () => {
    failWithNetwork();

    await call();

    expect(target().querySelector('.keep')).not.toBeNull();
    expect(target().firstElementChild.className).toBe('flash error cr-load-error');
    expect(target().firstElementChild.textContent).toBe('Failed to fetch');
  });
});
