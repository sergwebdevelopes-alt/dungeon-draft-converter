import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { chooseTokens } from './choose-patreon-tokens.ts';

const FROM_ENV = { accessToken: 'A1', refreshToken: 'R1', seededFrom: 'h1' };

describe('chooseTokens', () => {
  it('starts from the .env pair when nothing is stored', () => {
    assert.deepEqual(chooseTokens(null, FROM_ENV), {
      tokens: FROM_ENV,
      fromEnv: true,
    });
  });

  it('keeps the stored pair while .env still holds the token it started from', () => {
    const stored = { accessToken: 'A2', refreshToken: 'R2', seededFrom: 'h1' };

    assert.deepEqual(chooseTokens(stored, FROM_ENV), {
      tokens: stored,
      fromEnv: false,
    });
  });

  it('switches to .env once a new pair was put there', () => {
    const stored = { accessToken: 'A2', refreshToken: 'R2', seededFrom: 'h0' };

    assert.deepEqual(chooseTokens(stored, FROM_ENV), {
      tokens: FROM_ENV,
      fromEnv: true,
    });
  });
});
