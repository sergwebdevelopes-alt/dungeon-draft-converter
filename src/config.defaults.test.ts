import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

for (const name of [
  'MAX_UPLOAD_MB',
  'MAX_TOTAL_UPLOAD_MB',
  'MAX_PENDING_CONVERSIONS',
  'GALLERY_REQUEST_INTERVAL_SECONDS',
  'PATREON_WEBSITE_API_URL',
]) {
  delete process.env[name];
}
process.env.PATREON_WEBSITE_USER_AGENT = '';

const config = await import('./config.ts');

describe('config without settings', () => {
  it('keeps the limits it always had', () => {
    assert.equal(config.MAX_UPLOAD_BYTES, 200 * 1024 * 1024);
    assert.equal(config.MAX_TOTAL_UPLOAD_BYTES, 400 * 1024 * 1024);
    assert.equal(config.MAX_PENDING_CONVERSIONS, 10);
    assert.equal(config.GALLERY_REQUEST_INTERVAL_MS, 1000);
  });

  it('reads the Patreon website API directly when no address is given', () => {
    assert.equal(config.PATREON_WEBSITE_API_URL, 'https://www.patreon.com/api');
  });

  it('uses a desktop Chrome User-Agent when none is given', () => {
    assert.match(
      config.PATREON_WEBSITE_USER_AGENT,
      /^Mozilla\/5\.0 .*Chrome\//,
    );
  });
});
