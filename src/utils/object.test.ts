import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { withoutUndefined } from './object.ts';

describe('withoutUndefined', () => {
  it('drops fields without a value and keeps the rest, including null and 0', () => {
    assert.deepEqual(withoutUndefined({ a: 1, b: undefined, c: null, d: 0 }), {
      a: 1,
      c: null,
      d: 0,
    });
  });
});
