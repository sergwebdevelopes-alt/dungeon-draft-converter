import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';
import {
  HttpClientError,
  type HttpClient,
} from '../../../infrastructure/http-client/http-client.ts';
import type { PatreonSettings } from '../../../settings/read-settings.ts';
import { createPatreonTokenRefresher } from './patreon-token-refresher.ts';
import type { PatreonTokenRepository } from '../ports/patreon-token-repository.ts';
import type { StoredTokens } from '../domain/patreon-tokens.ts';

const SETTINGS: PatreonSettings = {
  campaignId: '1',
  clientId: 'client',
  clientSecret: 'secret',
  creatorToken: 'A1',
  refreshToken: 'R1',
};

const R1_HASH = createHash('sha256').update('R1').digest('hex');

function fakeStore(initial: StoredTokens | null = null) {
  let stored = initial;
  const saves: StoredTokens[] = [];
  const store: PatreonTokenRepository = {
    load: () => Promise.resolve(stored),
    save(tokens) {
      stored = tokens;
      saves.push(tokens);
      return Promise.resolve();
    },
  };

  return { store, saves, stored: () => stored };
}

function fakeHttp(answers: unknown[]) {
  const urls: string[] = [];
  const http: HttpClient = {
    get: () => Promise.reject(new Error('Not used.')),
    getBytes: () => Promise.reject(new Error('Not used.')),
    async post<T>(url: string) {
      urls.push(url);
      await Promise.resolve();
      const answer = answers.shift();
      if (answer instanceof Error) {
        throw answer;
      }
      return answer as T;
    },
  };

  return { http, urls };
}

function tokenAnswer(access: string, refresh: string) {
  return { access_token: access, refresh_token: refresh, expires_in: 2678400 };
}

describe('createPatreonTokenRefresher', () => {
  it('starts from the .env pair and stores it with its fingerprint', async () => {
    const { store, stored } = fakeStore();
    const auth = createPatreonTokenRefresher(
      fakeHttp([]).http,
      SETTINGS,
      store,
    );

    assert.equal(await auth.accessToken(), 'A1');
    assert.deepEqual(stored(), {
      accessToken: 'A1',
      refreshToken: 'R1',
      seededFrom: R1_HASH,
    });
  });

  it('uses the stored pair while .env still holds the token it started from', async () => {
    const { store, saves } = fakeStore({
      accessToken: 'A2',
      refreshToken: 'R2',
      seededFrom: R1_HASH,
    });
    const auth = createPatreonTokenRefresher(
      fakeHttp([]).http,
      SETTINGS,
      store,
    );

    assert.equal(await auth.accessToken(), 'A2');
    assert.equal(saves.length, 0);
  });

  it('switches to a new pair put in .env', async () => {
    const { store, stored } = fakeStore({
      accessToken: 'A2',
      refreshToken: 'R2',
      seededFrom: R1_HASH,
    });
    const settings = { ...SETTINGS, creatorToken: 'A9', refreshToken: 'R9' };
    const auth = createPatreonTokenRefresher(
      fakeHttp([]).http,
      settings,
      store,
    );

    assert.equal(await auth.accessToken(), 'A9');
    assert.equal(stored()?.refreshToken, 'R9');
    assert.notEqual(stored()?.seededFrom, R1_HASH);
  });

  it('refreshes with the stored refresh token and keeps the new pair, with the same fingerprint', async () => {
    const { store, stored } = fakeStore({
      accessToken: 'A2',
      refreshToken: 'R2',
      seededFrom: R1_HASH,
    });
    const { http, urls } = fakeHttp([tokenAnswer('A3', 'R3')]);
    const auth = createPatreonTokenRefresher(http, SETTINGS, store);

    assert.equal(await auth.refresh(), 'A3');

    const query = new URL(urls[0]).searchParams;
    assert.equal(new URL(urls[0]).pathname, '/api/oauth2/token');
    assert.equal(query.get('grant_type'), 'refresh_token');
    assert.equal(query.get('refresh_token'), 'R2');
    assert.equal(query.get('client_id'), 'client');
    assert.equal(query.get('client_secret'), 'secret');
    assert.deepEqual(stored(), {
      accessToken: 'A3',
      refreshToken: 'R3',
      seededFrom: R1_HASH,
    });
    assert.equal(await auth.accessToken(), 'A3');
  });

  it('makes one request when several callers refresh at once', async () => {
    const { store } = fakeStore();
    const { http, urls } = fakeHttp([tokenAnswer('A2', 'R2')]);
    const auth = createPatreonTokenRefresher(http, SETTINGS, store);

    const tokens = await Promise.all([auth.refresh(), auth.refresh()]);

    assert.deepEqual(tokens, ['A2', 'A2']);
    assert.equal(urls.length, 1);
  });

  it('keeps the stored pair when a refresh fails, and can try again', async () => {
    const { store, stored } = fakeStore();
    const { http, urls } = fakeHttp([
      new HttpClientError(400, 'Invalid grant.'),
      tokenAnswer('A2', 'R2'),
    ]);
    const auth = createPatreonTokenRefresher(http, SETTINGS, store);

    await assert.rejects(auth.refresh(), /Invalid grant/);
    assert.equal(stored()?.refreshToken, 'R1');

    assert.equal(await auth.refresh(), 'A2');
    assert.equal(urls.length, 2);
  });
});
