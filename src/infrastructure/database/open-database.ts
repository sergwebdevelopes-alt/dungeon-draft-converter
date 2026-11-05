import type { Database, DatabaseConnection } from './database.ts';
import { runMigrations } from './run-migrations.ts';
import { createPgDatabase } from './pg-database.ts';

function migrationsMessage(applied: string[]): string {
  return applied.length > 0
    ? `Database migrated: ${applied.join(', ')}.`
    : 'Database is up to date.';
}

async function openDatabase(connection: DatabaseConnection): Promise<Database> {
  const db = createPgDatabase(connection);
  const applied = await runMigrations(db);
  console.log(migrationsMessage(applied));

  return db;
}

export { openDatabase };
