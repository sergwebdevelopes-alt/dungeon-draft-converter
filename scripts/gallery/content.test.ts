import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';
import { parseManifest } from './manifest.ts';

const ROOT_DIR = path.join(import.meta.dirname, '../..');

describe('content/maps.json', () => {
  it('is a valid manifest that never points at client work', async () => {
    const raw = JSON.parse(
      await fs.readFile(path.join(ROOT_DIR, 'content/maps.json'), 'utf8'),
    ) as unknown;

    const entries = parseManifest(raw);

    assert.ok(entries.length > 0);
    for (const { sources } of entries) {
      assert.doesNotMatch(sources.noGrid + sources.grid, /Tych Maps/);
    }
  });

  it('matches the catalog the site serves', async () => {
    const manifest = parseManifest(
      JSON.parse(
        await fs.readFile(path.join(ROOT_DIR, 'content/maps.json'), 'utf8'),
      ) as unknown,
    );
    const catalog = JSON.parse(
      await fs.readFile(
        path.join(ROOT_DIR, 'web/public/maps/catalog.json'),
        'utf8',
      ),
    ) as { maps: { slug: string }[] };

    assert.deepEqual(
      catalog.maps.map((map) => map.slug),
      manifest.map((entry) => entry.slug),
    );
  });
});
