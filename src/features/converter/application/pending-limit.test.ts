import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PendingLimit } from './pending-limit.ts';

describe('PendingLimit', () => {
  it('allows up to the maximum number of requests at once', () => {
    const limit = new PendingLimit(2);

    const first = limit.reserve();
    const second = limit.reserve();

    assert.equal(typeof first, 'function');
    assert.equal(typeof second, 'function');
    assert.equal(limit.reserve(), undefined);

    first?.();

    assert.equal(typeof limit.reserve(), 'function');
  });

  it('frees only one place when a reservation is released twice', () => {
    const limit = new PendingLimit(2);

    const first = limit.reserve();
    limit.reserve();

    first?.();
    first?.();

    assert.equal(typeof limit.reserve(), 'function');
    assert.equal(limit.reserve(), undefined);
  });

  for (const value of [0, -1, 1.5, Number.NaN]) {
    it(`rejects a maximum of ${value}`, () => {
      assert.throws(() => new PendingLimit(value), {
        message: `maxPending must be a whole number of at least 1, got ${value}.`,
      });
    });
  }
});
