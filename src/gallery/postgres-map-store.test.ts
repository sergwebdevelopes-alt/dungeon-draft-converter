import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import { runMigrations } from '../db/migrations.ts';
import { createTestDatabase, type TestDatabase } from '../db/testing.ts';
import type { MapStore } from './map-store.ts';
import type { MapRecord } from './model/types.ts';
import { createPostgresMapStore } from './postgres-map-store.ts';

function map(overrides: Partial<MapRecord> = {}): MapRecord {
  return {
    postId: '166553789',
    slug: 'tser-falls',
    title: 'Tser Falls',
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
      isMain: false,
      fileName: 'TserFalls_60x40_140px_NoGrid.jpg',
    },
    ...overrides,
  };
}

describe('createPostgresMapStore', () => {
  let test: TestDatabase;
  let store: MapStore;

  before(async () => {
    test = await createTestDatabase();
    await runMigrations(test.db);
    store = createPostgresMapStore(test.db);
  });

  beforeEach(async () => {
    await test.db.query('TRUNCATE maps');
  });

  after(() => test.drop());

  it('saves a map and reads every field back', async () => {
    await store.saveMap(map(), { post: 'raw' });

    const [saved] = await store.listMaps();
    const { checkedAt, ...rest } = saved;
    assert.deepEqual(rest, map());
    assert.ok(Date.parse(checkedAt) > 0);
  });

  it('reads optional fields back as missing, not as empty values', async () => {
    const plain = map({
      subtitle: undefined,
      squares: undefined,
      image: { ...map().image, fileName: undefined, isMain: true },
    });
    await store.saveMap(plain, {});

    const [saved] = await store.listMaps();
    assert.equal('subtitle' in saved, false);
    assert.equal('squares' in saved, false);
    assert.equal('fileName' in saved.image, false);
    assert.equal(saved.image.isMain, true);
  });

  it('updates a saved map', async () => {
    await store.saveMap(map(), { version: 1 });

    await store.saveMap(
      map({ title: 'Tser Falls at Night', squares: undefined }),
      {
        version: 2,
      },
    );

    const maps = await store.listMaps();
    assert.equal(maps.length, 1);
    assert.equal(maps[0].title, 'Tser Falls at Night');
    assert.equal(maps[0].squares, undefined);
    const [{ source }] = await test.db.query<{ source: unknown }>(
      'SELECT source FROM maps',
    );
    assert.deepEqual(source, { version: 2 });
  });

  it('lists the newest maps first', async () => {
    await store.saveMap(
      map({
        postId: '1',
        slug: 'old',
        publishedAt: '2024-01-01T00:00:00.000Z',
      }),
      {},
    );
    await store.saveMap(
      map({
        postId: '2',
        slug: 'new',
        publishedAt: '2026-01-01T00:00:00.000Z',
      }),
      {},
    );

    assert.deepEqual(
      (await store.listMaps()).map((m) => m.slug),
      ['new', 'old'],
    );
  });

  it('removes only the given maps', async () => {
    await store.saveMap(map({ postId: '1', slug: 'a' }), {});
    await store.saveMap(map({ postId: '2', slug: 'b' }), {});

    await store.removeMaps([]);
    await store.removeMaps(['1']);

    assert.deepEqual(
      (await store.listMaps()).map((m) => m.postId),
      ['2'],
    );
  });
});
