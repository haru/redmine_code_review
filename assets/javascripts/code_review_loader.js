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

// Registries are top-level vars on purpose: the unit test harness re-runs this
// script per test (fresh state), and the document-level listeners below resolve
// these names at dispatch time, so they always reach the latest registries.
var crInitHandlers = {};
var crActions = {};

/**
 * Registers the handler for a `data-cr-init` marker name.
 * @param {string} name - Value of the marker to handle.
 * @param {function(Element)} handler - Called with the marker element.
 */
function crRegisterInit(name, handler) {
  if (crInitHandlers[name]) {
    throw new Error(`code_review: init "${name}" is already registered`);
  }
  crInitHandlers[name] = handler;
}

/**
 * Registers the handler for a `data-cr-action` element. The handler is
 * invoked through the document-level delegated listeners for its event.
 * @param {string} name - Value of the `data-cr-action` attribute.
 * @param {'click'|'change'} event - Event the handler reacts to.
 * @param {function(Element, Event)} handler - Called with the action element and event.
 */
function crRegisterAction(name, event, handler) {
  if (crActions[name]) {
    throw new Error(`code_review: action "${name}" is already registered`);
  }
  crActions[name] = { event, handler };
}

/**
 * Reads a required attribute, naming it when it is missing.
 * @param {Element} el - Element carrying the attribute.
 * @param {string} name - Attribute name.
 * @returns {string} Attribute value.
 */
function crAttr(el, name) {
  const value = el.getAttribute(name);
  if (value === null) {
    throw new Error(`code_review: missing attribute "${name}"`);
  }
  return value;
}

/**
 * Reads a required attribute holding JSON.
 * @param {Element} el - Element carrying the attribute.
 * @param {string} name - Attribute name.
 * @returns {object|Array} Parsed value.
 */
function crAttrJson(el, name) {
  const value = crAttr(el, name);
  try {
    return JSON.parse(value);
  }
  catch (e) {
    throw new Error(`code_review: attribute "${name}" is not valid JSON: ${e.message}`, { cause: e });
  }
}

/**
 * Reads a required boolean attribute; only "true" / "false" are accepted.
 * @param {Element} el - Element carrying the attribute.
 * @param {string} name - Attribute name.
 * @returns {boolean} Parsed value.
 */
function crAttrBool(el, name) {
  const value = crAttr(el, name);
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  throw new Error(`code_review: attribute "${name}" must be "true" or "false", got "${value}"`);
}

/**
 * Reads a required integer attribute; anything that is not an integer throws.
 * @param {Element} el - Element carrying the attribute.
 * @param {string} name - Attribute name.
 * @returns {number} Parsed value.
 */
function crAttrInt(el, name) {
  const value = crAttr(el, name);
  if (!/^-?\d+$/.test(value)) {
    throw new Error(`code_review: attribute "${name}" must be an integer, got "${value}"`);
  }
  return Number.parseInt(value, 10);
}

/**
 * Reads a required `data-cr-*` attribute by its short name.
 * @param {Element} el - Element carrying the attribute.
 * @param {string} name - Attribute name without the `data-cr-` prefix.
 * @returns {string} Attribute value.
 */
function crData(el, name) {
  return crAttr(el, 'data-cr-' + name);
}

/**
 * Finds the one element a selector matches; a selector without a match throws.
 * @param {string} selector - CSS selector.
 * @returns {Element} The first matching element.
 */
function crQuery(selector) {
  const el = document.querySelector(selector);
  if (!el) {
    throw new Error(`code_review: selector "${selector}" matches no element`);
  }
  return el;
}

/**
 * Finds the element a `data-cr-*` selector attribute points at.
 * @param {Element} el - Element carrying the attribute.
 * @param {string} name - Attribute name holding a CSS selector.
 * @returns {Element} The element the selector matches.
 */
function crTarget(el, name) {
  return crQuery(crAttr(el, name));
}

/**
 * Initializes every `data-cr-init` marker under `root`. The attribute is
 * removed before the handler runs, so an element is never initialized twice.
 * @param {Element|Document} root - Root to scan for markers.
 */
function crInitialize(root) {
  root.querySelectorAll('[data-cr-init]').forEach((el) => {
    const name = el.getAttribute('data-cr-init');
    el.removeAttribute('data-cr-init');
    const handler = crInitHandlers[name];
    if (!handler) {
      throw new Error(`code_review: unregistered init "${name}"`);
    }
    handler(el);
  });
}

/**
 * Finds the action element the event belongs to and dispatches it to the
 * registered handler; clicks on `href="#"` links do not navigate.
 * @param {Event} event - The delegated click or change event.
 * @param {'click'|'change'} type - Event type this listener handles.
 */
function crDispatchAction(event, type) {
  const el = event.target.closest('[data-cr-action]');
  if (!el) {
    return;
  }
  const name = el.getAttribute('data-cr-action');
  const action = crActions[name];
  if (!action) {
    throw new Error(`code_review: unregistered action "${name}"`);
  }
  if (action.event !== type) {
    return;
  }
  if (type === 'click' && el.tagName === 'A' && el.getAttribute('href') === '#') {
    event.preventDefault();
  }
  action.handler(el, event);
}

// Delegation is bound exactly once; re-running the script (tests, or the file
// being served twice) must not duplicate the listeners.
if (!globalThis.crActionDelegationBound) {
  globalThis.crActionDelegationBound = true;
  document.addEventListener('click', (event) => crDispatchAction(event, 'click'));
  document.addEventListener('change', (event) => crDispatchAction(event, 'change'));
}

/**
 * Shows the failure of a partial load at the top of the target, keeping the
 * existing content and replacing a previous error message.
 * @param {Element} target - Element the load was bound to.
 * @param {string} message - Message to display.
 */
function crShowLoadError(target, message) {
  target.querySelectorAll(':scope > .cr-load-error').forEach((el) => el.remove());
  const flash = document.createElement('div');
  flash.className = 'flash error cr-load-error';
  flash.textContent = message;
  target.prepend(flash);
}

/**
 * Builds the fetch arguments: GET params go to the query string, POST params
 * become the urlencoded body together with the CSRF token.
 * @param {string} url - URL to load.
 * @param {{method: 'GET'|'POST', params: (object|URLSearchParams|FormData)=}} options - See crLoad.
 * @returns {{requestUrl: string, init: object}} URL and fetch options.
 */
function crBuildRequest(url, options) {
  const { method } = options;
  const params = options.params && new URLSearchParams(options.params);
  const headers = { 'X-Requested-With': 'XMLHttpRequest' };
  if (method === 'GET') {
    const query = params ? (url.includes('?') ? '&' : '?') + params.toString() : '';
    return { requestUrl: url + query, init: { method, headers, body: null } };
  }
  headers['Content-Type'] = 'application/x-www-form-urlencoded';
  // Rails renders no csrf_meta_tag when forgery protection is off (test env);
  // there is no token to send then.
  const meta = document.querySelector('meta[name="csrf-token"]');
  if (meta) {
    headers['X-CSRF-Token'] = meta.getAttribute('content');
  }
  return { requestUrl: url, init: { method, headers, body: params ? params.toString() : '' } };
}

/**
 * Loads `url` into `target` with fetch, replacing its content on success and
 * showing the failure at the top of the target otherwise, then initializes
 * the loaded fragment. A failing initialization is shown the same way and
 * then rethrown.
 * @param {Element} target - Element whose content is replaced; checked before
 *   anything is sent, so a missing target never leaves a half-done POST behind.
 * @param {string} url - URL to load.
 * @param {{method: 'GET'|'POST', params: (object|URLSearchParams|FormData)=}} options
 *   `method` is required; `params` becomes the query string (GET) or the
 *   urlencoded body (POST).
 * @returns {Promise<void>} Resolves after the response was displayed.
 * @throws {Error} When `target` is not an element, `method` is neither GET nor
 *   POST, or the loaded fragment fails to initialize.
 */
async function crLoad(target, url, options) {
  if (!(target instanceof Element)) {
    throw new Error(`code_review: crLoad target must be an element, got ${target}`);
  }
  const method = options && options.method;
  if (method !== 'GET' && method !== 'POST') {
    throw new Error(`code_review: crLoad requires method "GET" or "POST", got ${method}`);
  }
  const { requestUrl, init } = crBuildRequest(url, options);
  let response;
  let text;
  try {
    response = await fetch(requestUrl, init);
    text = await response.text();
  }
  catch (e) {
    crShowLoadError(target, e.message);
    return;
  }
  if (!response.ok) {
    crShowLoadError(target, `${response.status} ${response.statusText}`);
    return;
  }
  target.replaceChildren(document.createRange().createContextualFragment(text));
  try {
    crInitialize(target);
  }
  catch (e) {
    crShowLoadError(target, e.message);
    throw e;
  }
}

/**
 * Runs `handler` once the document is ready.
 * @param {function()} handler - Called with no arguments.
 */
function crReady(handler) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => handler());
  }
  else {
    handler();
  }
}

crReady(() => crInitialize(document));
