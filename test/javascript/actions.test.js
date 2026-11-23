import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadClassicScripts, flushReady } from './support/load_classic_script.js';

describe('action dispatch', () => {
  beforeEach(async () => {
    document.body.innerHTML = '<div id="content"></div>';
    loadClassicScripts();
    await flushReady();
  });

  const element = (html) => {
    document.getElementById('content').innerHTML = html;
    return document.getElementById('content').firstElementChild;
  };

  const click = (el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  const change = (el) => el.dispatchEvent(new Event('change', { bubbles: true }));

  it('calls the handler registered for the action with the element and event', () => {
    const handler = vi.fn();
    crRegisterAction('act', 'click', handler);
    const el = element('<button data-cr-action="act"></button>');

    click(el);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toBe(el);
    expect(handler.mock.calls[0][1].type).toBe('click');
  });

  it('uses the nearest ancestor carrying data-cr-action', () => {
    const outer = vi.fn();
    const inner = vi.fn();
    crRegisterAction('outer', 'click', outer);
    crRegisterAction('inner', 'click', inner);
    element('<div data-cr-action="outer"><span data-cr-action="inner"><b id="deep">x</b></span></div>');

    click(document.getElementById('deep'));

    expect(inner).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();
  });

  it('ignores the event type the action was not registered for', () => {
    const onClick = vi.fn();
    const onChange = vi.fn();
    crRegisterAction('click-act', 'click', onClick);
    crRegisterAction('change-act', 'change', onChange);
    const clicked = element('<button data-cr-action="click-act"></button>');
    const changed = element('<select data-cr-action="change-act"></select>');

    change(clicked);
    click(changed);

    expect(onClick).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('prevents the default navigation of href="#" links', () => {
    crRegisterAction('noop-link', 'click', vi.fn());
    const el = element('<a href="#" data-cr-action="noop-link">edit</a>');
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    el.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it('throws when the action name is not registered', () => {
    const el = element('<button data-cr-action="unknown-act"></button>');

    // jsdom reports listener exceptions to the console instead of the
    // dispatcher, so the delegated dispatch function is called directly with
    // a plain event-like object (only target and preventDefault are used).
    expect(() => crDispatchAction({ target: el, preventDefault: () => {} }, 'click'))
      .toThrowError(/unknown-act/);
  });

  it('handles elements inserted after the listeners were registered, once per event', () => {
    const handler = vi.fn();
    crRegisterAction('late', 'click', handler);
    const el = document.createElement('button');
    el.setAttribute('data-cr-action', 'late');
    document.getElementById('content').append(el);

    click(el);
    click(el);

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('does nothing on elements without data-cr-action', () => {
    const handler = vi.fn();
    crRegisterAction('act', 'click', handler);
    const el = element('<button class="plain">x</button>');

    click(el);

    expect(handler).not.toHaveBeenCalled();
  });

  it('does not re-register the delegated listeners when scripts load again', async () => {
    // Reloading resets the registries, so the handler is registered after the
    // reload: if the listeners were duplicated, the single click would reach
    // it twice through the old and the new listener.
    loadClassicScripts();
    await flushReady();
    const handler = vi.fn();
    crRegisterAction('act', 'click', handler);
    const el = element('<button data-cr-action="act"></button>');

    click(el);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('rejects a duplicate registration', () => {
    crRegisterAction('act', 'click', vi.fn());

    expect(() => crRegisterAction('act', 'change', vi.fn())).toThrowError(/act/);
  });
});
