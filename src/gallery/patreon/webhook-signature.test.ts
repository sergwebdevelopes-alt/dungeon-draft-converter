import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { describe, it } from 'node:test';
import { isValidSignature } from './webhook-signature.ts';

const SECRET = 'webhook-secret';
const BODY = Buffer.from('{"data":{"id":"172779058","type":"post"}}');

function sign(body: Buffer, secret = SECRET): string {
  return createHmac('md5', secret).update(body).digest('hex');
}

describe('isValidSignature', () => {
  it('accepts the HMAC-MD5 of the body made with the secret', () => {
    assert.equal(isValidSignature(BODY, sign(BODY), SECRET), true);
  });

  it('refuses a signature made with another secret or for another body', () => {
    assert.equal(isValidSignature(BODY, sign(BODY, 'other'), SECRET), false);
    assert.equal(
      isValidSignature(Buffer.from(`${BODY.toString()} `), sign(BODY), SECRET),
      false,
    );
  });

  it('refuses a missing, shortened or malformed signature', () => {
    assert.equal(isValidSignature(BODY, undefined, SECRET), false);
    assert.equal(isValidSignature(BODY, '', SECRET), false);
    assert.equal(
      isValidSignature(BODY, sign(BODY).slice(0, 30), SECRET),
      false,
    );
    assert.equal(isValidSignature(BODY, 'not hex at all', SECRET), false);
  });
});
