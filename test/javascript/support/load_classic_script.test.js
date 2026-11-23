import { describe, it, expect } from 'vitest';
import { loadClassicScripts } from './load_classic_script.js';

describe('loadClassicScripts', () => {
  it('exposes the globals of code_review.js', () => {
    loadClassicScripts();

    expect(ReviewCount).toBeTypeOf('function');
    expect(CodeReview).toBeTypeOf('function');
    expect(UpdateRepositoryView).toBeTypeOf('function');
    expect(UpdateRevisionView).toBeTypeOf('function');
    expect(setAddReviewButton).toBeTypeOf('function');
  });

  it('disables jQuery animations', () => {
    loadClassicScripts();

    expect($.fx.off).toBe(true);
  });

  it('fails loudly when a dependency file is missing', () => {
    expect(() => loadClassicScripts(['does/not/exist.js']))
      .toThrowError(/does\/not\/exist\.js/);
  });
});
