import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { elapsed } from './time.ts';

describe('elapsed', () => {
  it('gives the time between two moments', () => {
    assert.equal(elapsed(1_000, 1_400), 400);
  });

  it('is unknown when either moment is missing', () => {
    assert.equal(elapsed(undefined, 1_400), undefined);
    assert.equal(elapsed(1_000, undefined), undefined);
  });
});
