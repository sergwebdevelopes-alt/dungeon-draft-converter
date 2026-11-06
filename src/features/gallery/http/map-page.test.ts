import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { GalleryStores } from '../ports/gallery-stores.ts';
import type { StoredMap } from '../ports/map-repository.ts';
import { createFindMapPage } from './map-page.ts';

const FALLBACK = 'Browse every map.';

function storedMap(overrides: Partial<StoredMap> = {}): StoredMap {
  return {
    postId: '166553789',
    slug: 'tser-falls',
    title: 'Tser Falls',
    description: '<p>A <strong>roaring</strong> waterfall.</p>',
    tags: [],
    patreonUrl: 'https://www.patreon.com/posts/tser-166553789',
    publishedAt: '2025-07-01T10:00:00.000Z',
    image: {
      url: 'https://cdn.test/falls.jpg',
      width: 8400,
      height: 5600,
      mediaId: '717019350',
    },
    ...overrides,
  } as StoredMap;
}

function stores(maps: StoredMap[]): GalleryStores {
  return {
    maps: {
      findMap: (slug: string) =>
        Promise.resolve(maps.find((map) => map.slug === slug) ?? null),
    },
    images: { urlFor: (key: string) => `/maps/${key}` },
  } as unknown as GalleryStores;
}

describe('createFindMapPage', () => {
  it('gives a map its title, a plain summary and its view image', async () => {
    const find = createFindMapPage(stores([storedMap()]), FALLBACK);

    assert.deepEqual(await find('tser-falls'), {
      title: 'Tser Falls',
      description: 'A roaring waterfall.',
      imageUrl: '/maps/166553789/717019350/view.webp',
      imageAlt: 'Tser Falls',
    });
  });

  it('uses the fallback for a map without a description', async () => {
    const find = createFindMapPage(
      stores([
        storedMap({ description: undefined }),
        storedMap({ slug: 'empty', description: '<p> </p>' }),
      ]),
      FALLBACK,
    );

    assert.equal((await find('tser-falls'))?.description, FALLBACK);
    assert.equal((await find('empty'))?.description, FALLBACK);
  });

  it('finds nothing for an unknown map or without a gallery', async () => {
    assert.equal(await createFindMapPage(stores([]), FALLBACK)('nope'), null);
    assert.equal(
      await createFindMapPage(undefined, FALLBACK)('tser-falls'),
      null,
    );
  });
});
