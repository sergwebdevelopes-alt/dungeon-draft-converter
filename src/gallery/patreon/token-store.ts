interface PatreonTokens {
  accessToken: string;
  refreshToken: string;
}

interface StoredTokens extends PatreonTokens {
  seededFrom: string;
}

interface TokenStore {
  load(): Promise<StoredTokens | null>;
  save(tokens: StoredTokens): Promise<void>;
}

export type { PatreonTokens, StoredTokens, TokenStore };
