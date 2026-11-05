import { randomUUID } from 'node:crypto';
import { SETTINGS } from '../../config.ts';
import type { Database, DatabaseConnection } from './database.ts';
import { createPgDatabase } from './pg-database.ts';

interface TestDatabase {
  connection: DatabaseConnection;
  db: Database;
  drop(): Promise<void>;
}

const TEST_DATABASE = SETTINGS.database;

async function createTestDatabase(): Promise<TestDatabase> {
  if (!TEST_DATABASE) {
    throw new Error('Set POSTGRES_* in .env.testing for the database tests.');
  }

  const admin = createPgDatabase(TEST_DATABASE);
  const name = `test_${randomUUID().replaceAll('-', '')}`;
  try {
    await admin.query(`CREATE DATABASE ${name}`);
  } catch (error) {
    await admin.close();
    const { host, port } = TEST_DATABASE;
    throw new Error(
      `The test database at ${host}:${port} is not reachable. Start it with npm run db.`,
      { cause: error },
    );
  }
  const connection = { ...TEST_DATABASE, database: name };
  const db = createPgDatabase(connection);

  return {
    connection,
    db,
    async drop() {
      await db.close();
      await admin.query(`DROP DATABASE ${name} WITH (FORCE)`);
      await admin.close();
    },
  };
}

export { createTestDatabase };
export type { TestDatabase };
