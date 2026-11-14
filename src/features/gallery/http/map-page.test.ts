import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { GalleryStores } from '../ports/gallery-stores.ts';
import type { StoredMap } from '../ports/map-repository.ts';
import {
  collectionPagePath,
  createFindCollectionPage,
  createFindMapPage,
  createListMapLinks,
  mapPagePath,
} from './map-page.ts';

function storedMap(overrides: Partial<StoredMap> = {}): StoredMap {
  return {
    postId: '166553789',
    slug: 'tser-falls',
    title: 'Tser Falls',
    description: '<p>A <strong>roaring</strong> waterfall.</p>',
    tags: [],
    patreonUrl: 'https://www.patreon.com/posts/tser-166553789',
    publishedAt: '2025-07-01T10:00:00.000Z',
    images: [
      {
        url: 'https://cdn.test/falls.jpg',
        width: 8400,
        height: 5600,
        mediaId: '717019350',
      },
    ],
    ...overrides,
  } as StoredMap;
}

function stores(maps: StoredMap[]): GalleryStores {
  return {
    maps: {
      listMaps: () => Promise.resolve(maps),
      listTags: () =>
        Promise.resolve([...new Set(maps.flatMap((map) => map.tags))]),
      findMap: (slug: string) =>
        Promise.resolve(maps.find((map) => map.slug === slug) ?? null),
    },
    images: { urlFor: (key: string) => `/maps/${key}` },
  } as unknown as GalleryStores;
}

describe('createFindMapPage', () => {
  it('gives a map its title, a plain summary and its view image', async () => {
    const find = createFindMapPage(stores([storedMap()]));

    assert.deepEqual(await find('tser-falls'), {
      title: 'Tser Falls Battle Map · Lair of Artificer',
      name: 'Tser Falls',
      path: '/maps/other/tser-falls',
      description: 'Tser Falls, a D&D battle map. A roaring waterfall.',
      imageUrl: '/maps/166553789/717019350/view.webp',
      imageAlt: 'Tser Falls Battle Map',
      patreonUrl: 'https://www.patreon.com/posts/tser-166553789',
      publishedAt: '2025-07-01T10:00:00.000Z',
    });
  });

  it('names the collection and the size in squares where the map has them', async () => {
    const find = createFindMapPage(
      stores([
        storedMap({
          subtitle: 'Curse of Strahd',
          tags: ['Curse of Strahd'],
          squares: { x: 60, y: 40 },
        }),
      ]),
    );
    const page = await find('tser-falls');

    assert.equal(
      page?.title,
      'Tser Falls Battle Map · Curse of Strahd · Lair of Artificer',
    );
    assert.equal(page?.path, '/maps/curse-of-strahd/tser-falls');
    assert.equal(
      page?.description,
      'Tser Falls, a 60 × 40 D&D battle map for Curse of Strahd. A roaring waterfall.',
    );
  });

  it('finds nothing for an unknown map or without a gallery', async () => {
    assert.equal(await createFindMapPage(stores([]))('nope'), null);
    assert.equal(await createFindMapPage(undefined)('tser-falls'), null);
  });
});

describe('mapPagePath', () => {
  it('puts the map under its first collection, with the slug encoded', () => {
    assert.equal(
      mapPagePath({
        slug: 'tser-falls',
        tags: ['Curse of Strahd', 'Waterdeep'],
      }),
      '/maps/curse-of-strahd/tser-falls',
    );
    assert.equal(
      mapPagePath({ slug: 'a&b c', tags: ['Waterdeep'] }),
      '/maps/waterdeep/a%26b%20c',
    );
  });

  it('still gives an address to a map without a collection', () => {
    assert.equal(
      mapPagePath({ slug: 'tser-falls', tags: [] }),
      '/maps/other/tser-falls',
    );
  });
});

describe('collectionPagePath', () => {
  it('makes the address from the name of the collection', () => {
    assert.equal(
      collectionPagePath('Curse of Strahd'),
      '/maps/curse-of-strahd',
    );
    assert.equal(
      collectionPagePath('Hand Drawn Maps'),
      '/maps/hand-drawn-maps',
    );
  });
});

describe('createFindCollectionPage', () => {
  const find = createFindCollectionPage(
    stores([storedMap({ tags: ['Curse of Strahd', 'Hand Drawn Maps'] })]),
  );

  it('finds a collection by the last part of its address', async () => {
    assert.deepEqual(await find('curse-of-strahd'), {
      title: 'Curse of Strahd Battle Maps · Lair of Artificer',
      description:
        'Hand-drawn D&D battle maps from the Curse of Strahd collection. View every level with or without the grid and get the VTT files on Patreon.',
      path: '/maps/curse-of-strahd',
    });
    assert.equal(
      (await find('hand-drawn-maps'))?.path,
      '/maps/hand-drawn-maps',
    );
  });

  it('finds nothing for an unknown collection or without a gallery', async () => {
    assert.equal(await find('waterdeep'), null);
    assert.equal(await find('Curse of Strahd'), null);
    assert.equal(
      await createFindCollectionPage(undefined)('curse-of-strahd'),
      null,
    );
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
      {
        path: '/maps/other/tser-falls',
        publishedAt: '2025-07-01T10:00:00.000Z',
      },
      { path: '/maps/other/a%26b', publishedAt: '2024-09-05T16:14:17.000Z' },
    ]);
  });

  it('links to every collection first, dated by its newest map', async () => {
    const list = createListMapLinks(
      stores([
        storedMap({
          slug: 'old',
          tags: ['Waterdeep'],
          publishedAt: '2024-01-01T00:00:00.000Z',
        }),
        storedMap({
          slug: 'new',
          tags: ['Waterdeep', 'Curse of Strahd'],
          publishedAt: '2025-01-01T00:00:00.000Z',
        }),
        storedMap({
          slug: 'older',
          tags: ['Waterdeep'],
          publishedAt: '2023-01-01T00:00:00.000Z',
        }),
      ]),
    );

    assert.deepEqual((await list()).slice(0, 2), [
      { path: '/maps/waterdeep', publishedAt: '2025-01-01T00:00:00.000Z' },
      {
        path: '/maps/curse-of-strahd',
        publishedAt: '2025-01-01T00:00:00.000Z',
      },
    ]);
  });

  it('lists no maps without a gallery', async () => {
    assert.deepEqual(await createListMapLinks(undefined)(), []);
  });
});
