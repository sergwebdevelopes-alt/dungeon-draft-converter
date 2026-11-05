import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { runMigrations } from '../../../infrastructure/database/run-migrations.ts';
import {
  createTestDatabase,
  type TestDatabase,
} from '../../../infrastructure/database/test-database.ts';
import { createPostgresPatreonTokenRepository } from './postgres-patreon-token-repository.ts';
import type { PatreonTokenRepository } from '../ports/patreon-token-repository.ts';

describe('createPostgresPatreonTokenRepository', () => {
  let test: TestDatabase;
  let store: PatreonTokenRepository;

  before(async () => {
    test = await createTestDatabase();
    await runMigrations(test.db);
    store = createPostgresPatreonTokenRepository(test.db);
  });

  after(() => test.drop());

  it('has nothing before the first save, then keeps one pair that each save replaces', async () => {
    assert.equal(await store.load(), null);

    await store.save({
      accessToken: 'A1',
      refreshToken: 'R1',
      seededFrom: 'h1',
    });
    await store.save({
      accessToken: 'A2',
      refreshToken: 'R2',
      seededFrom: 'h1',
    });

    assert.deepEqual(await store.load(), {
      accessToken: 'A2',
      refreshToken: 'R2',
      seededFrom: 'h1',
    });
    const [{ rows }] = await test.db.query<{ rows: number }>(
      'SELECT count(*)::int AS rows FROM patreon_tokens',
    );
    assert.equal(rows, 1);
  });
});
