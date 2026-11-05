import pg from 'pg';
import type { Database, DatabaseConnection, Queryable } from './database.ts';

const MAX_CONNECTIONS = 5;

function queryable(client: pg.Pool | pg.PoolClient): Queryable {
  return {
    async query<T>(sql: string, params: unknown[] = []) {
      const result = await client.query(sql, params);
      return result.rows as T[];
    },
  };
}

function createPgDatabase(connection: DatabaseConnection): Database {
  const pool = new pg.Pool({ ...connection, max: MAX_CONNECTIONS });

  return {
    ...queryable(pool),

    async transaction(work) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const value = await work(queryable(client));
        await client.query('COMMIT');
        return value;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },

    async close() {
      await pool.end();
    },
  };
}

export { createPgDatabase };
