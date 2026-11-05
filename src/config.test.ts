import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

Object.assign(process.env, {
  MAX_UPLOAD_MB: '50',
  MAX_TOTAL_UPLOAD_MB: ' 60 ',
  MAX_PENDING_CONVERSIONS: '',
  MAX_PARALLEL_CONVERSIONS: '   ',
  GALLERY_REQUEST_INTERVAL_SECONDS: '2',
  CONVERSION_TIMEOUT_SECONDS: '90',
  PATREON_WEBSITE_USER_AGENT: 'Lair test agent',
  PATREON_WEBSITE_API_URL: ' https://relay.example.workers.dev/api// ',
});

const config = await import('./config.ts');

describe('config', () => {
  it('reads the upload limits in megabytes', () => {
    assert.equal(config.MAX_UPLOAD_BYTES, 50 * 1024 * 1024);
    assert.equal(config.MAX_TOTAL_UPLOAD_BYTES, 60 * 1024 * 1024);
  });

  it('reads seconds as milliseconds', () => {
    assert.equal(config.GALLERY_REQUEST_INTERVAL_MS, 2000);
    assert.equal(config.CONVERSION_TIMEOUT_MS, 90_000);
  });

  it('uses the default for an empty or blank number', () => {
    assert.equal(config.MAX_PENDING_CONVERSIONS, 10);
    assert.equal(config.MAX_PARALLEL_CONVERSIONS, 1);
  });

  it('uses the given User-Agent for the Patreon website', () => {
    assert.equal(config.PATREON_WEBSITE_USER_AGENT, 'Lair test agent');
  });

  it('reads the Patreon website API address without trailing slashes', () => {
    assert.equal(
      config.PATREON_WEBSITE_API_URL,
      'https://relay.example.workers.dev/api',
    );
  });
});
