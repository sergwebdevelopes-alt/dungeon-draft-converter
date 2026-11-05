import { createHmac, timingSafeEqual } from 'node:crypto';

function isValidSignature(
  rawBody: Buffer,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!signature) {
    return false;
  }

  const expected = createHmac('md5', secret).update(rawBody).digest();
  const given = Buffer.from(signature, 'hex');

  return given.length === expected.length && timingSafeEqual(given, expected);
}

export { isValidSignature };
