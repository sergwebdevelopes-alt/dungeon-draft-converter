import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { GalleryStores } from '../ports/gallery-stores.ts';
import type { StoredMap } from '../ports/map-repository.ts';
import {
  createFindMapPage,
  createListMapLinks,
  mapPagePath,
} from './map-page.ts';

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
      listMaps: () => Promise.resolve(maps),
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
      patreonUrl: 'https://www.patreon.com/posts/tser-166553789',
      publishedAt: '2025-07-01T10:00:00.000Z',
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

describe('mapPagePath', () => {
  it('links to the map in the gallery, with the slug encoded', () => {
    assert.equal(mapPagePath('tser-falls'), '/maps?map=tser-falls');
    assert.equal(mapPagePath('a&b c'), '/maps?map=a%26b%20c');
  });
});

describe('createListMapLinks', () => {
  it('links to every map with its publishing date', async () => {
    const list = createListMapLinks(
      stores([
        storedMap(),
        storedMap({ slug: 'a&b', publishedAt: '2024-09-05T16:14:17.000Z' }),
      ]),
    );

    assert.deepEqual(await list(), [
      { path: '/maps?map=tser-falls', publishedAt: '2025-07-01T10:00:00.000Z' },
      { path: '/maps?map=a%26b', publishedAt: '2024-09-05T16:14:17.000Z' },
    ]);
  });

  it('lists no maps without a gallery', async () => {
    assert.deepEqual(await createListMapLinks(undefined)(), []);
  });
});
