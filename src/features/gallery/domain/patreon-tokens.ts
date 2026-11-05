interface PatreonTokens {
  accessToken: string;
  refreshToken: string;
}

interface StoredTokens extends PatreonTokens {
  seededFrom: string;
}

export type { PatreonTokens, StoredTokens };
