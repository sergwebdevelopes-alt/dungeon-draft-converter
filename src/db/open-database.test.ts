import assert from 'node:assert/strict';
import { after, before, describe, it, mock } from 'node:test';
import { openDatabase } from './open-database.ts';
import { createTestDatabase, type TestDatabase } from './testing.ts';

describe('openDatabase', () => {
  let test: TestDatabase;

  before(async () => {
    test = await createTestDatabase();
  });

  after(() => test.drop());

  it('migrates the database and says what it applied', async () => {
    const log = mock.method(console, 'log', () => undefined);

    try {
      const first = await openDatabase(test.connection);
      await first.close();
      const second = await openDatabase(test.connection);
      await second.close();

      assert.deepEqual(
        log.mock.calls.map((call) => String(call.arguments[0])),
        [
          'Database migrated: 001_gallery.sql, 002_deferred_slugs.sql, 003_drop_source.sql, 004_drop_image_choice_columns.sql, 005_patreon_tokens.sql, 006_map_description.sql.',
          'Database is up to date.',
        ],
      );
    } finally {
      log.mock.restore();
    }
  });

  it('opens a database ready to query', async () => {
    const log = mock.method(console, 'log', () => undefined);
    const db = await openDatabase(test.connection);

    try {
      const [row] = await db.query<{ found: string | null }>(
        "SELECT to_regclass('maps')::text AS found",
      );
      assert.equal(row.found, 'maps');
    } finally {
      await db.close();
      log.mock.restore();
    }
  });
});
