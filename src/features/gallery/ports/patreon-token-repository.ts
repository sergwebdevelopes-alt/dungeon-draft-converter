import type { StoredTokens } from '../domain/patreon-tokens.ts';

interface TokenStore {
  load(): Promise<StoredTokens | null>;
  save(tokens: StoredTokens): Promise<void>;
}

export type { TokenStore };
