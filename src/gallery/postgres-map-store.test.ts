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
    },
    ...overrides,
  };
}

describe('createPostgresMapStore', () => {
  let test: TestDatabase;
  let store: MapStore;

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
    store = createPostgresMapStore(test.db);
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
});
