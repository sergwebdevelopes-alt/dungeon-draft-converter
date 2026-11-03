import fs from 'node:fs/promises';
import path from 'node:path';
import type { Database, Queryable } from './database.ts';
import { LOCKS } from './locks.ts';

const MIGRATIONS_DIR = path.join(import.meta.dirname, 'migrations');

interface Migration {
  name: string;
  sql: string;
}

async function readMigrations(dir: string): Promise<Migration[]> {
  const names = (await fs.readdir(dir))
    .filter((name) => name.endsWith('.sql'))
    .sort();

  return Promise.all(
    names.map(async (name) => ({
      name,
      sql: await fs.readFile(path.join(dir, name), 'utf8'),
    })),
  );
}

async function appliedNames(tx: Queryable): Promise<Set<string>> {
  await tx.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`,
  );
  const rows = await tx.query<{ name: string }>(
    'SELECT name FROM schema_migrations',
  );

  return new Set(rows.map((row) => row.name));
}

async function runMigrations(
  db: Database,
  dir = MIGRATIONS_DIR,
): Promise<string[]> {
  const migrations = await readMigrations(dir);

  return db.transaction(async (tx) => {
    await tx.query('SELECT pg_advisory_xact_lock($1)', [LOCKS.migrations]);
    const applied = await appliedNames(tx);
    const pending = migrations.filter((m) => !applied.has(m.name));

    for (const migration of pending) {
      await tx.query(migration.sql);
      await tx.query('INSERT INTO schema_migrations (name) VALUES ($1)', [
        migration.name,
      ]);
    }

    return pending.map((m) => m.name);
  });
}

export { runMigrations };
