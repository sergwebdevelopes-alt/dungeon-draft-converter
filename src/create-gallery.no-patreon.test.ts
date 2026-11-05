import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import type { GalleryStores } from './features/gallery/ports/gallery-stores.ts';

for (const key of Object.keys(process.env)) {
  if (key.startsWith('PATREON_')) {
    delete process.env[key];
  }
}

const { createGallerySyncIfConfigured } = await import('./create-gallery.ts');

describe('createGallerySyncIfConfigured without Patreon settings', () => {
  it('gives no sync even with a database', () => {
    const log = mock.method(console, 'log', () => undefined);

    try {
      assert.equal(
        createGallerySyncIfConfigured({} as GalleryStores),
        undefined,
      );
      assert.match(String(log.mock.calls[0].arguments[0]), /sync is off/);
    } finally {
      log.mock.restore();
    }
  });
});
