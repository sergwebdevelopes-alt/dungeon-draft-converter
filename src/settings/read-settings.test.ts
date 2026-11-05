import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readSettings } from './read-settings.ts';

const PATREON = {
  PATREON_CAMPAIGN_ID: '12754508',
  PATREON_CLIENT_ID: 'client',
  PATREON_CLIENT_SECRET: 'secret',
  PATREON_CREATOR_TOKEN: 'creator',
  PATREON_REFRESH_TOKEN: 'refresh',
};
const DATABASE = { POSTGRES_USER: 'artificer', POSTGRES_PASSWORD: 'p@ss:w/rd' };

describe('readSettings', () => {
  it('starts with the gallery off and default gallery settings', () => {
    assert.deepEqual(readSettings({}), {
      settings: { gallery: { syncIntervalMinutes: 60 } },
      problems: [],
    });
  });

  it('reads a complete setup', () => {
    const { settings, problems } = readSettings({
      POSTGRES_HOST: 'postgres',
      POSTGRES_PORT: '6543',
      ...DATABASE,
      POSTGRES_DB: 'gallery',
      ...PATREON,
      PATREON_WEBHOOK_SECRET: 'hook',
      GALLERY_SYNC_INTERVAL_MINUTES: '15',
    });

    assert.deepEqual(problems, []);
    assert.deepEqual(settings, {
      database: {
        host: 'postgres',
        port: 6543,
        user: 'artificer',
        password: 'p@ss:w/rd',
        database: 'gallery',
      },
      patreon: {
        campaignId: '12754508',
        clientId: 'client',
        clientSecret: 'secret',
        creatorToken: 'creator',
        refreshToken: 'refresh',
        webhookSecret: 'hook',
      },
      gallery: {
        syncIntervalMinutes: 15,
      },
    });
  });

  it('connects to the local database by default, named after the user', () => {
    assert.deepEqual(readSettings(DATABASE).settings.database, {
      host: '127.0.0.1',
      port: 5432,
      user: 'artificer',
      password: 'p@ss:w/rd',
      database: 'artificer',
    });
  });

  it('treats empty and blank values as not set, and trims the rest', () => {
    const { settings, problems } = readSettings({
      POSTGRES_HOST: '  ',
      POSTGRES_USER: ' artificer ',
      POSTGRES_PASSWORD: 'pw',
      PATREON_CAMPAIGN_ID: '',
      GALLERY_SYNC_INTERVAL_MINUTES: '   ',
    });

    assert.deepEqual(problems, []);
    assert.equal(settings.database?.host, '127.0.0.1');
    assert.equal(settings.database?.user, 'artificer');
    assert.equal(settings.patreon, undefined);
    assert.equal(settings.gallery.syncIntervalMinutes, 60);
  });

  it('needs the database user and password together', () => {
    for (const env of [
      { POSTGRES_USER: 'artificer' },
      { POSTGRES_PASSWORD: 'pw' },
    ]) {
      assert.deepEqual(readSettings(env).problems, [
        'Database settings are incomplete: set POSTGRES_USER and POSTGRES_PASSWORD together.',
      ]);
    }
  });

  it('checks the database port', () => {
    const problemFor = (value: string) =>
      readSettings({ ...DATABASE, POSTGRES_PORT: value }).problems;

    assert.deepEqual(problemFor('0'), [
      'POSTGRES_PORT must be between 1 and 65535.',
    ]);
    assert.deepEqual(problemFor('70000'), [
      'POSTGRES_PORT must be between 1 and 65535.',
    ]);
    assert.deepEqual(problemFor('five'), [
      'POSTGRES_PORT must be a whole number.',
    ]);
    assert.deepEqual(problemFor('65535'), []);
  });

  it('leaves the webhook secret out when it is not set', () => {
    const { settings } = readSettings({ ...DATABASE, ...PATREON });

    assert.equal(
      settings.patreon && 'webhookSecret' in settings.patreon,
      false,
    );
  });

  it('names the missing Patreon settings when only some are set', () => {
    const { problems } = readSettings({
      ...DATABASE,
      PATREON_CAMPAIGN_ID: '1',
      PATREON_CREATOR_TOKEN: 't',
    });

    assert.deepEqual(problems, [
      'Patreon settings are incomplete: set PATREON_CLIENT_ID, PATREON_CLIENT_SECRET, PATREON_REFRESH_TOKEN.',
    ]);
  });

  it('needs a database for the Patreon sync', () => {
    assert.deepEqual(readSettings(PATREON).problems, [
      'The Patreon gallery sync needs a database: set POSTGRES_USER and POSTGRES_PASSWORD.',
    ]);
  });

  it('checks the sync interval', () => {
    const problemFor = (value: string) =>
      readSettings({ GALLERY_SYNC_INTERVAL_MINUTES: value }).problems;

    assert.deepEqual(problemFor('4'), [
      'GALLERY_SYNC_INTERVAL_MINUTES must be at least 5.',
    ]);
    assert.deepEqual(problemFor('often'), [
      'GALLERY_SYNC_INTERVAL_MINUTES must be a whole number.',
    ]);
    assert.deepEqual(problemFor('7.5'), [
      'GALLERY_SYNC_INTERVAL_MINUTES must be a whole number.',
    ]);
    assert.deepEqual(problemFor('5'), []);
  });

  it('ignores the old GALLERY_SYNC_TOKEN, even a short one', () => {
    const { settings, problems } = readSettings({
      ...DATABASE,
      GALLERY_SYNC_TOKEN: 'short',
    });

    assert.deepEqual(problems, []);
    assert.deepEqual(settings.gallery, { syncIntervalMinutes: 60 });
  });

  it('lists every problem at once and falls back to the defaults', () => {
    const { settings, problems } = readSettings({
      POSTGRES_USER: 'artificer',
      POSTGRES_PORT: 'five',
      PATREON_CLIENT_ID: 'client',
    });

    assert.deepEqual(problems, [
      'POSTGRES_PORT must be a whole number.',
      'Database settings are incomplete: set POSTGRES_USER and POSTGRES_PASSWORD together.',
      'Patreon settings are incomplete: set PATREON_CAMPAIGN_ID, PATREON_CLIENT_SECRET, PATREON_CREATOR_TOKEN, PATREON_REFRESH_TOKEN.',
    ]);
    assert.deepEqual(settings, {
      gallery: { syncIntervalMinutes: 60 },
    });
  });
});
