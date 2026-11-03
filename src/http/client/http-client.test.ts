import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { HttpClientError, isAbortError } from './http-client.ts';

describe('isAbortError', () => {
  it('recognises a cancelled and a timed-out request', () => {
    assert.equal(isAbortError(new DOMException('x', 'AbortError')), true);
    assert.equal(isAbortError(new DOMException('x', 'TimeoutError')), true);
  });

  it('leaves other errors alone', () => {
    assert.equal(isAbortError(new DOMException('x', 'NetworkError')), false);
    assert.equal(isAbortError(new HttpClientError(500, 'Down.')), false);
    assert.equal(isAbortError(new Error('x')), false);
  });
});
