import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import type { GalleryStores } from './setup.ts';

Object.assign(process.env, {
  PATREON_CAMPAIGN_ID: '1',
  PATREON_CLIENT_ID: 'client',
  PATREON_CLIENT_SECRET: 'secret',
  PATREON_CREATOR_TOKEN: 'creator',
  PATREON_REFRESH_TOKEN: 'refresh',
});

const { createGallerySyncIfConfigured } = await import('./setup.ts');

function stores(): GalleryStores {
  return {
    maps: {
      listMaps: () => Promise.resolve([]),
      replaceMaps: () => Promise.resolve(),
    },
    images: {
      has: () => Promise.resolve(false),
      put: () => Promise.resolve(),
      removeFolder: () => Promise.resolve(),
      urlFor: (key) => key,
    },
    tokens: {
      load: () => Promise.resolve(null),
      save: () => Promise.resolve(),
    },
  };
}

describe('createGallerySyncIfConfigured', () => {
  it('gives no sync without a database, and says why', () => {
    const log = mock.method(console, 'log', () => undefined);

    try {
      assert.equal(createGallerySyncIfConfigured(undefined), undefined);
      assert.match(String(log.mock.calls[0].arguments[0]), /sync is off/);
    } finally {
      log.mock.restore();
    }
  });

  it('builds one sync that can be stopped when the database and Patreon are set', () => {
    const sync = createGallerySyncIfConfigured(stores());

    assert.equal(typeof sync?.run, 'function');
    assert.equal(typeof sync?.stop, 'function');
    sync?.stop();
  });
});
