import type { Database, DatabaseConnection } from './database.ts';
import { runMigrations } from './migrations.ts';
import { createPgDatabase } from './pg-database.ts';

async function openDatabase(connection: DatabaseConnection): Promise<Database> {
  const db = createPgDatabase(connection);
  const applied = await runMigrations(db);

  console.log(
    applied.length > 0
      ? `Database migrated: ${applied.join(', ')}.`
      : 'Database is up to date.',
  );

  return db;
}

export { openDatabase };
