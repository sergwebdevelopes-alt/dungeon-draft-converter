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

  it('keeps versioned gallery images for a year', () => {
    assert.equal(
      cacheControlFor('/maps/cave/717019350/card.webp'),
      'public, max-age=31536000, immutable',
    );
  });

  it('keeps gallery images and icons for a day, as they can be rebuilt', () => {
    assert.equal(
      cacheControlFor('/maps/cave/card.webp'),
      'public, max-age=86400',
    );
    assert.equal(cacheControlFor('/favicon.ico'), 'public, max-age=86400');
  });

  it('checks pages, the catalog and the theme script on every visit', () => {
    for (const urlPath of ['/', '/maps/catalog.json', '/theme.js']) {
      assert.equal(cacheControlFor(urlPath), 'no-cache', urlPath);
    }
  });
});
