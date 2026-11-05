import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cacheControlFor } from './cache-control.ts';

describe('cacheControlFor', () => {
  it('keeps hashed build files for a year', () => {
    assert.equal(
      cacheControlFor('/assets/index-Cx_sdpeo.js'),
      'public, max-age=31536000, immutable',
    );
  });

  it('keeps gallery images for a year, as each image version has its own folder', () => {
    assert.equal(
      cacheControlFor('/maps/166553789/717019350/card.webp'),
      'public, max-age=31536000, immutable',
    );
  });

  it('keeps icons for a day, as they can change', () => {
    assert.equal(cacheControlFor('/favicon.ico'), 'public, max-age=86400');
    assert.equal(cacheControlFor('/icon-192.png'), 'public, max-age=86400');
    assert.equal(cacheControlFor('/maps-preview.png'), 'public, max-age=86400');
  });

  it('checks pages, the gallery page and the theme script on every visit', () => {
    for (const urlPath of [
      '/',
      '/maps',
      '/maps/166553789/notes.txt',
      '/converter',
      '/theme.js',
    ]) {
      assert.equal(cacheControlFor(urlPath), 'no-cache', urlPath);
    }
  });
});
