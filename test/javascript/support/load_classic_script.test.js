import { describe, it, expect } from 'vitest';
import { loadClassicScripts } from './load_classic_script.js';

describe('loadClassicScripts', () => {
  it('exposes the globals of code_review.js', () => {
    loadClassicScripts();

    expect(crInitRevisionsView).toBeTypeOf('function');
    expect(crInitRevisionView).toBeTypeOf('function');
    expect(setAddReviewButton).toBeTypeOf('function');
  });

  it('loads the plugin scripts only, no jQuery', () => {
    loadClassicScripts();

    expect(globalThis.$).toBeUndefined();
    expect(globalThis.jQuery).toBeUndefined();
  });

  it('fails loudly when a dependency file is missing', () => {
    expect(() => loadClassicScripts(['does/not/exist.js']))
      .toThrowError(/does\/not\/exist\.js/);
  });
});
