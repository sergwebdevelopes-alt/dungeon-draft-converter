import type { StoredTokens } from '../domain/patreon-tokens.ts';

interface PatreonTokenRepository {
  load(): Promise<StoredTokens | null>;
  save(tokens: StoredTokens): Promise<void>;
}

export type { PatreonTokenRepository };
