import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import { runMigrations } from '../../../infrastructure/database/run-migrations.ts';
import {
  createTestDatabase,
  type TestDatabase,
} from '../../../infrastructure/database/test-database.ts';
import type { MapRepository } from '../ports/map-repository.ts';
import type { MapRecord } from '../domain/map-record.ts';
import { createPostgresMapRepository } from './postgres-map-repository.ts';

function map(overrides: Partial<MapRecord> = {}): MapRecord {
  return {
    postId: '166553789',
    slug: 'tser-falls',
    title: 'Tser Falls',
    description: '<p>A <strong>roaring</strong> waterfall.</p>',
    subtitle: 'Curse of Strahd',
    tags: ['Barovia', 'Curse of Strahd'],
    squares: { x: 60, y: 40 },
    patreonUrl: 'https://www.patreon.com/LairofArtificer/posts/tser-166553789',
    publishedAt: '2025-07-01T10:00:00.000Z',
    image: {
      url: 'https://cdn.test/falls.jpg',
      width: 8400,
      height: 5600,
      mediaId: '717019350',
    },
    ...overrides,
  };
}

describe('createPostgresMapRepository', () => {
  let test: TestDatabase;
  let store: MapRepository;

  async function times(): Promise<{ updatedAt: string; checkedAt: string }> {
    const [row] = await test.db.query<{
      updatedAt: string;
      checkedAt: string;
    }>(
      `SELECT to_char(updated_at, 'YYYY') AS "updatedAt",
              to_char(checked_at, 'YYYY') AS "checkedAt"
       FROM maps`,
    );

    return row;
  }

  before(async () => {
    test = await createTestDatabase();
    await runMigrations(test.db);
    store = createPostgresMapRepository(test.db);
  });

  beforeEach(async () => {
    await test.db.query('TRUNCATE maps');
  });

  after(() => test.drop());

  it('saves a map and reads every field back', async () => {
    await store.replaceMaps([map()]);

    const [saved] = await store.listMaps();
    const { checkedAt, ...rest } = saved;
    assert.deepEqual(rest, map());
    assert.ok(Date.parse(checkedAt) > 0);
  });

  it('reads optional fields back as missing, not as empty values', async () => {
    await store.replaceMaps([map({ subtitle: undefined, squares: undefined })]);

    const [saved] = await store.listMaps();
    assert.equal('subtitle' in saved, false);
    assert.equal('squares' in saved, false);
  });

  it('updates saved maps', async () => {
    await store.replaceMaps([map()]);

    await store.replaceMaps([
      map({ title: 'Tser Falls at Night', squares: undefined }),
    ]);

    const maps = await store.listMaps();
    assert.equal(maps.length, 1);
    assert.equal(maps[0].title, 'Tser Falls at Night');
    assert.equal(maps[0].squares, undefined);
  });

  it('moves updated_at only when the map changed, and checked_at on every save', async () => {
    await store.replaceMaps([map()]);
    await test.db.query(
      "UPDATE maps SET updated_at = '2020-01-01', checked_at = '2020-01-01'",
    );

    await store.replaceMaps([map()]);
    const unchanged = await times();
    await store.replaceMaps([map({ tags: ['Original Content'] })]);
    const changed = await times();

    assert.equal(unchanged.updatedAt, '2020');
    assert.notEqual(unchanged.checkedAt, '2020');
    assert.notEqual(changed.updatedAt, '2020');
  });

  it('counts the maps it added, changed and removed', async () => {
    assert.deepEqual(await store.replaceMaps([]), {
      added: 0,
      updated: 0,
      removed: 0,
    });
    await store.replaceMaps([
      map({ postId: '1', slug: 'a' }),
      map({ postId: '2', slug: 'b' }),
      map({ postId: '3', slug: 'c' }),
      map({ postId: '5', slug: 'e' }),
    ]);

    const counts = await store.replaceMaps([
      map({ postId: '1', slug: 'a' }),
      map({ postId: '2', slug: 'b', title: 'Renamed' }),
      map({ postId: '3', slug: 'c', description: '<p>New story.</p>' }),
      map({ postId: '4', slug: 'd' }),
    ]);

    assert.deepEqual(counts, { added: 1, updated: 2, removed: 1 });
  });

  it('lists the newest maps first', async () => {
    await store.replaceMaps([
      map({
        postId: '1',
        slug: 'old',
        publishedAt: '2024-01-01T00:00:00.000Z',
      }),
      map({
        postId: '2',
        slug: 'new',
        publishedAt: '2026-01-01T00:00:00.000Z',
      }),
    ]);

    assert.deepEqual(
      (await store.listMaps()).map((m) => m.slug),
      ['new', 'old'],
    );
  });

  it('removes the maps that are not in the new list', async () => {
    await store.replaceMaps([
      map({ postId: '1', slug: 'a' }),
      map({ postId: '2', slug: 'b' }),
    ]);

    await store.replaceMaps([map({ postId: '2', slug: 'b' })]);
    assert.deepEqual(
      (await store.listMaps()).map((m) => m.postId),
      ['2'],
    );

    await store.replaceMaps([]);
    assert.deepEqual(await store.listMaps(), []);
  });

  it('lets two maps swap their slugs', async () => {
    await store.replaceMaps([
      map({ postId: '1', slug: 'a' }),
      map({ postId: '2', slug: 'b' }),
    ]);

    await store.replaceMaps([
      map({ postId: '1', slug: 'b' }),
      map({ postId: '2', slug: 'a' }),
    ]);

    const slugs = Object.fromEntries(
      (await store.listMaps()).map((m) => [m.postId, m.slug]),
    );
    assert.deepEqual(slugs, { '1': 'b', '2': 'a' });
  });

  it('keeps the old gallery when saving fails half way', async () => {
    await store.replaceMaps([map({ postId: '1', slug: 'a' })]);

    await assert.rejects(
      store.replaceMaps([
        map({ postId: '2', slug: 'same' }),
        map({ postId: '3', slug: 'same' }),
      ]),
    );

    assert.deepEqual(
      (await store.listMaps()).map((m) => m.postId),
      ['1'],
    );
  });

  function published(postId: string, year: number, tags: string[]): MapRecord {
    return map({
      postId,
      slug: `map-${postId}`,
      publishedAt: `${year}-01-01T00:00:00.000Z`,
      tags,
    });
  }

  const SHELF = [
    published('1', 2021, ['Barovia']),
    published('2', 2022, ['Waterdeep', 'Barovia']),
    published('3', 2023, []),
    published('4', 2024, ['Waterdeep']),
    published('5', 2025, ['Ships', 'Waterdeep']),
  ];

  async function slugsOfPage(
    query: Parameters<MapRepository['listMapsPage']>[0],
  ) {
    const page = await store.listMapsPage(query);

    return { slugs: page.maps.map((m) => m.slug), total: page.total };
  }

  it('pages through the newest maps first and counts them all', async () => {
    await store.replaceMaps(SHELF);

    assert.deepEqual(await slugsOfPage({ offset: 0, limit: 2 }), {
      slugs: ['map-5', 'map-4'],
      total: 5,
    });
    assert.deepEqual(await slugsOfPage({ offset: 2, limit: 2 }), {
      slugs: ['map-3', 'map-2'],
      total: 5,
    });
    assert.deepEqual(await slugsOfPage({ offset: 4, limit: 2 }), {
      slugs: ['map-1'],
      total: 5,
    });
    assert.deepEqual(await slugsOfPage({ offset: 10, limit: 2 }), {
      slugs: [],
      total: 5,
    });
  });

  it('pages through one collection with its own total', async () => {
    await store.replaceMaps(SHELF);

    assert.deepEqual(
      await slugsOfPage({ tag: 'Waterdeep', offset: 1, limit: 5 }),
      { slugs: ['map-4', 'map-2'], total: 3 },
    );
    assert.deepEqual(await slugsOfPage({ tag: 'Nope', offset: 0, limit: 5 }), {
      slugs: [],
      total: 0,
    });
  });

  it('lists each collection once, in the order its newest map came out', async () => {
    assert.deepEqual(await store.listTags(), []);

    await store.replaceMaps(SHELF);

    assert.deepEqual(await store.listTags(), ['Ships', 'Waterdeep', 'Barovia']);
  });

  it('finds a map by its slug', async () => {
    await store.replaceMaps(SHELF);

    const found = await store.findMap('map-2');

    assert.equal(found?.postId, '2');
    assert.deepEqual(found?.tags, ['Waterdeep', 'Barovia']);
    assert.equal(await store.findMap('nope'), null);
  });
});
