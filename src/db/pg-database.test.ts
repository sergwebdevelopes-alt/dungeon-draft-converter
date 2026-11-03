import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { createTestDatabase, type TestDatabase } from './testing.ts';

describe('createPgDatabase', () => {
  let test: TestDatabase;

  before(async () => {
    test = await createTestDatabase();
    await test.db.query('CREATE TABLE notes (text text NOT NULL)');
  });

  after(() => test.drop());

  it('runs a query with parameters and returns the rows', async () => {
    const rows = await test.db.query<{ sum: number }>(
      'SELECT $1::int + $2::int AS sum',
      [2, 3],
    );

    assert.deepEqual(rows, [{ sum: 5 }]);
  });

  it('keeps the work of a transaction that succeeds', async () => {
    await test.db.transaction(async (tx) => {
      await tx.query("INSERT INTO notes VALUES ('kept')");
    });

    const rows = await test.db.query("SELECT 1 FROM notes WHERE text = 'kept'");
    assert.equal(rows.length, 1);
  });

  it('undoes a transaction that fails and passes the error on', async () => {
    await assert.rejects(
      test.db.transaction(async (tx) => {
        await tx.query("INSERT INTO notes VALUES ('undone')");
        throw new Error('Broken half way.');
      }),
      /Broken half way/,
    );

    const rows = await test.db.query(
      "SELECT 1 FROM notes WHERE text = 'undone'",
    );
    assert.equal(rows.length, 0);
  });
});
