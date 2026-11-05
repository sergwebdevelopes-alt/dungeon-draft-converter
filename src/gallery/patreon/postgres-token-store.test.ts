import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { runMigrations } from '../../db/migrations.ts';
import { createTestDatabase, type TestDatabase } from '../../db/testing.ts';
import { createPostgresTokenStore } from './postgres-token-store.ts';
import type { TokenStore } from './token-store.ts';

describe('createPostgresTokenStore', () => {
  let test: TestDatabase;
  let store: TokenStore;

  before(async () => {
    test = await createTestDatabase();
    await runMigrations(test.db);
    store = createPostgresTokenStore(test.db);
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
