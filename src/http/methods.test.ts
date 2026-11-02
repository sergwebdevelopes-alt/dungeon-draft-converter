import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isSafeMethod } from './methods.ts';

describe('isSafeMethod', () => {
  it('treats GET, HEAD and OPTIONS as safe', () => {
    for (const method of ['GET', 'HEAD', 'OPTIONS']) {
      assert.equal(isSafeMethod(method), true, method);
    }
  });

  it('treats methods that change something as unsafe', () => {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      assert.equal(isSafeMethod(method), false, method);
    }
  });
});
