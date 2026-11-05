import { createHash } from 'node:crypto';
import { PATREON_TOKEN_URL } from '../../config.ts';
import type { HttpClient } from '../../http/client/http-client.ts';
import type { PatreonSettings } from '../../settings/read-settings.ts';
import { chooseTokens } from '../model/tokens.ts';
import type { StoredTokens, TokenStore } from './token-store.ts';

interface PatreonAuth {
  accessToken(): Promise<string>;
  refresh(): Promise<string>;
}

interface TokenAnswer {
  access_token: string;
  refresh_token: string;
}

function fingerprint(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function refreshUrl(refreshToken: string, settings: PatreonSettings): string {
  const query = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: settings.clientId,
    client_secret: settings.clientSecret,
  });

  return `${PATREON_TOKEN_URL}?${query}`;
}

function createPatreonAuth(
  http: HttpClient,
  settings: PatreonSettings,
  store: TokenStore,
): PatreonAuth {
  let refreshing: Promise<string> | null = null;

  const fromEnv: StoredTokens = {
    accessToken: settings.creatorToken,
    refreshToken: settings.refreshToken,
    seededFrom: fingerprint(settings.refreshToken),
  };

  async function currentTokens(): Promise<StoredTokens> {
    const { tokens, fromEnv: isNew } = chooseTokens(
      await store.load(),
      fromEnv,
    );
    if (isNew) {
      await store.save(tokens);
    }

    return tokens;
  }

  async function requestNewTokens(): Promise<string> {
    const { refreshToken, seededFrom } = await currentTokens();
    const answer = await http.post<TokenAnswer>(
      refreshUrl(refreshToken, settings),
    );

    await store.save({
      accessToken: answer.access_token,
      refreshToken: answer.refresh_token,
      seededFrom,
    });
    return answer.access_token;
  }

  async function refreshOnce(): Promise<string> {
    try {
      return await requestNewTokens();
    } finally {
      refreshing = null;
    }
  }

  return {
    async accessToken() {
      const { accessToken } = await currentTokens();
      return accessToken;
    },

    refresh() {
      refreshing ??= refreshOnce();
      return refreshing;
    },
  };
}

export { createPatreonAuth };
export type { PatreonAuth };
