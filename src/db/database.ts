interface DatabaseConnection {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

interface Queryable {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
}

interface Database extends Queryable {
  transaction<T>(work: (tx: Queryable) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export type { Database, DatabaseConnection, Queryable };
