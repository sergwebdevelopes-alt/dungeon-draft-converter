import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { createPgDatabase } from './pg-database.ts';
import { runMigrations } from './run-migrations.ts';
import { createTestDatabase, type TestDatabase } from './test-database.ts';

const APP_MIGRATIONS = [
  '001_gallery.sql',
  '002_deferred_slugs.sql',
  '003_drop_source.sql',
  '004_drop_image_choice_columns.sql',
  '005_patreon_tokens.sql',
  '006_map_description.sql',
  '007_map_images.sql',
];

const APP_MIGRATIONS_DIR = path.join(import.meta.dirname, 'migrations');

async function migrationsDir(files: Record<string, string>): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'migrations-'));
  for (const [name, sql] of Object.entries(files)) {
    await fs.writeFile(path.join(dir, name), sql);
  }

  return dir;
}

async function tableExists(test: TestDatabase, name: string): Promise<boolean> {
  const [row] = await test.db.query<{ found: string | null }>(
    'SELECT to_regclass($1)::text AS found',
    [name],
  );

  return row.found !== null;
}

describe('runMigrations', () => {
  let test: TestDatabase;

  afterEach(() => test.drop());

  it('applies the app migrations once and records them', async () => {
    test = await createTestDatabase();

    assert.deepEqual(await runMigrations(test.db), APP_MIGRATIONS);
    assert.deepEqual(await runMigrations(test.db), []);
    assert.ok(await tableExists(test, 'maps'));
    const recorded = await test.db.query<{ name: string }>(
      'SELECT name FROM schema_migrations',
    );
    assert.deepEqual(
      recorded.map((row) => row.name),
      APP_MIGRATIONS,
    );
  });

  it('gives maps saved before 007 their cover as the first image', async () => {
    test = await createTestDatabase();
    const before: Record<string, string> = {};
    for (const name of APP_MIGRATIONS.slice(0, 6)) {
      before[name] = await fs.readFile(
        path.join(APP_MIGRATIONS_DIR, name),
        'utf8',
      );
    }
    await runMigrations(test.db, await migrationsDir(before));
    await test.db.query(
      `INSERT INTO maps (post_id, slug, title, patreon_url, published_at,
         image_url, image_width, image_height, image_media_id)
       VALUES ('1', 'cave', 'Cave', 'https://www.patreon.com/posts/1', now(),
         'https://cdn.test/cave.jpg', 2000, 1000, 'm1')`,
    );

    assert.deepEqual(await runMigrations(test.db), ['007_map_images.sql']);

    const [row] = await test.db.query<{ images: unknown }>(
      'SELECT images FROM maps',
    );
    assert.deepEqual(row.images, [
      {
        url: 'https://cdn.test/cave.jpg',
        width: 2000,
        height: 1000,
        mediaId: 'm1',
      },
    ]);
  });

  it('applies the files in name order and skips other files', async () => {
    test = await createTestDatabase();
    const dir = await migrationsDir({
      '010_second.sql': 'ALTER TABLE first ADD COLUMN extra int',
      '002_first.sql': 'CREATE TABLE first (id int)',
      'notes.txt': 'not a migration',
    });

    assert.deepEqual(await runMigrations(test.db, dir), [
      '002_first.sql',
      '010_second.sql',
    ]);
  });

  it('applies nothing when one migration fails', async () => {
    test = await createTestDatabase();
    const dir = await migrationsDir({
      '001_good.sql': 'CREATE TABLE good (id int)',
      '002_bad.sql': 'CREATE TABLE broken (',
    });

    await assert.rejects(runMigrations(test.db, dir));

    assert.equal(await tableExists(test, 'good'), false);
    assert.equal(await tableExists(test, 'schema_migrations'), false);
  });

  it('applies each migration once when two app copies start together', async () => {
    test = await createTestDatabase();
    const second = createPgDatabase(test.connection);

    try {
      const results = await Promise.all([
        runMigrations(test.db),
        runMigrations(second),
      ]);

      assert.deepEqual(results.flat().sort(), APP_MIGRATIONS);
    } finally {
      await second.close();
    }
  });
});
