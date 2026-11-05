import type { Database } from '../../../infrastructure/database/database.ts';
import type { TokenStore } from '../ports/patreon-token-repository.ts';
import type { StoredTokens } from '../domain/patreon-tokens.ts';

interface TokenRow {
  access_token: string;
  refresh_token: string;
  seeded_from: string;
}

function createPostgresTokenStore(db: Database): TokenStore {
  return {
    async load() {
      const [row] = await db.query<TokenRow>(
        'SELECT access_token, refresh_token, seeded_from FROM patreon_tokens WHERE id = 1',
      );

      return row
        ? {
            accessToken: row.access_token,
            refreshToken: row.refresh_token,
            seededFrom: row.seeded_from,
          }
        : null;
    },

    async save({ accessToken, refreshToken, seededFrom }: StoredTokens) {
      await db.query(
        `INSERT INTO patreon_tokens (id, access_token, refresh_token, seeded_from, updated_at)
         VALUES (1, $1, $2, $3, now())
         ON CONFLICT (id) DO UPDATE SET
           access_token = EXCLUDED.access_token,
           refresh_token = EXCLUDED.refresh_token,
           seeded_from = EXCLUDED.seeded_from,
           updated_at = now()`,
        [accessToken, refreshToken, seededFrom],
      );
    },
  };
}

export { createPostgresTokenStore };
