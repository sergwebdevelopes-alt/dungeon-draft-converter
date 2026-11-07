import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import worker from './worker.js';

const SITE = 'https://lair.test';
const CHECKED = [
  `${SITE}/api/health`,
  `${SITE}/api/maps?limit=1`,
  `${SITE}/api/gallery/health`,
];

function fakeStore() {
  const saved = new Map();
  return {
    saved,
    writes: 0,
    get(key, type) {
      assert.equal(type, 'json');
      return Promise.resolve(
        saved.has(key) ? JSON.parse(saved.get(key)) : null,
      );
    },
    put(key, value) {
      this.writes += 1;
      saved.set(key, value);
      return Promise.resolve();
    },
  };
}

describe('site monitor worker', () => {
  let store;
  let env;
  let answers;
  let messages;
  let telegramStatus;
  let fetched;

  beforeEach(() => {
    store = fakeStore();
    env = {
      STATE: store,
      SITE_URL: `${SITE}/`,
      TELEGRAM_BOT_TOKEN: 'bot-token',
      TELEGRAM_CHAT_ID: '42',
    };
    answers = {};
    messages = [];
    telegramStatus = 200;
    fetched = [];

    mock.method(globalThis, 'fetch', (url, init = {}) => {
      if (url.startsWith('https://api.telegram.org/')) {
        assert.equal(url, 'https://api.telegram.org/botbot-token/sendMessage');
        assert.equal(init.method, 'POST');
        const body = JSON.parse(init.body);
        assert.equal(body.chat_id, '42');
        messages.push(body.text);
        return Promise.resolve(new Response('{}', { status: telegramStatus }));
      }

      fetched.push(url);
      assert.equal(init.headers['User-Agent'], 'lair-site-monitor');
      assert.ok(init.signal instanceof AbortSignal);
      const answer = answers[url] ?? 200;
      return answer instanceof Error
        ? Promise.reject(answer)
        : Promise.resolve(new Response('{}', { status: answer }));
    });
  });

  afterEach(() => {
    mock.restoreAll();
  });

  function run() {
    return worker.scheduled({}, env);
  }

  it('checks the site, the gallery and the sync, and stays quiet while they work', async () => {
    await run();
    await run();

    assert.deepEqual(fetched.sort(), [...CHECKED, ...CHECKED].sort());
    assert.deepEqual(messages, []);
    assert.equal(store.writes, 0);
  });

  it('checks the public site when no address is set', async () => {
    delete env.SITE_URL;

    await run();

    assert.ok(fetched.includes('https://lairofartificer.com/api/health'));
  });

  it('reports a failure once, on the second check in a row', async () => {
    answers[`${SITE}/api/gallery/health`] = 503;

    await run();
    assert.deepEqual(messages, []);

    await run();
    await run();
    await run();

    assert.deepEqual(messages, [
      `🔴 Patreon sync is down: HTTP 503\n${SITE}/api/gallery/health`,
    ]);
    assert.equal(store.writes, 2);
  });

  it('forgets a single failure', async () => {
    answers[`${SITE}/api/health`] = 502;
    await run();

    delete answers[`${SITE}/api/health`];
    await run();
    answers[`${SITE}/api/health`] = 502;
    await run();

    assert.deepEqual(messages, []);
  });

  it('reports the recovery once', async () => {
    answers[`${SITE}/api/maps?limit=1`] = new Error('The operation timed out.');
    await run();
    await run();

    delete answers[`${SITE}/api/maps?limit=1`];
    await run();
    await run();

    assert.deepEqual(messages, [
      `🔴 Gallery is down: The operation timed out.\n${SITE}/api/maps?limit=1`,
      `🟢 Gallery is back up\n${SITE}/api/maps?limit=1`,
    ]);
    assert.deepEqual(JSON.parse(store.saved.get('check:Gallery')), {
      failures: 0,
      alerted: false,
    });
  });

  it('tries the message again when Telegram refuses it', async () => {
    const error = mock.method(console, 'error', () => {});
    answers[`${SITE}/api/health`] = 500;
    await run();

    telegramStatus = 500;
    await run();
    assert.equal(error.mock.callCount(), 1);

    telegramStatus = 200;
    await run();

    assert.deepEqual(messages, [
      `🔴 Site is down: HTTP 500\n${SITE}/api/health`,
      `🔴 Site is down: HTTP 500\n${SITE}/api/health`,
    ]);
  });
});
