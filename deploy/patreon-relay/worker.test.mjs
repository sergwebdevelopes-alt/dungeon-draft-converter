import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import worker from './worker.js';

const RELAY = 'https://lair-patreon-relay.example.workers.dev';
const ENV = { RELAY_KEY: 'right-key' };

function request(path, { key = 'right-key', method = 'GET', agent } = {}) {
  const headers = {};
  if (key !== null) {
    headers['X-Relay-Key'] = key;
  }
  if (agent) {
    headers['User-Agent'] = agent;
  }

  return new Request(`${RELAY}${path}`, { method, headers });
}

describe('Patreon relay worker', () => {
  let patreon;

  beforeEach(() => {
    patreon = mock.method(globalThis, 'fetch', () =>
      Promise.resolve(
        Response.json({
          data: [{ id: '19' }],
          links: {
            next: 'https://www.patreon.com/api/posts?page%5Bcursor%5D=abc',
          },
        }),
      ),
    );
  });

  afterEach(() => {
    patreon.mock.restore();
  });

  it('refuses a request without the right key, and everyone without a key set or with an empty one', async () => {
    for (const [key, env] of [
      [null, ENV],
      ['wrong-key', ENV],
      ['right-key', {}],
      ['', { RELAY_KEY: '' }],
    ]) {
      const answer = await worker.fetch(request('/api/posts', { key }), env);

      assert.equal(answer.status, 403);
    }
    assert.equal(patreon.mock.callCount(), 0);
  });

  it('serves only reading posts', async () => {
    for (const [path, method] of [
      ['/api/users/1', 'GET'],
      ['/api/posts/abc', 'GET'],
      ['/', 'GET'],
      ['/api/posts', 'POST'],
    ]) {
      const answer = await worker.fetch(request(path, { method }), ENV);

      assert.equal(answer.status, 404, `${method} ${path}`);
    }
    assert.equal(patreon.mock.callCount(), 0);
  });

  it('asks Patreon for the same posts with the caller user agent', async () => {
    await worker.fetch(
      request('/api/posts/19?include=media%2Ccollections', {
        agent: 'Lair test agent',
      }),
      ENV,
    );

    const [url, options] = patreon.mock.calls[0].arguments;
    assert.equal(
      url,
      'https://www.patreon.com/api/posts/19?include=media%2Ccollections',
    );
    assert.equal(options.headers['User-Agent'], 'Lair test agent');
    assert.equal(options.headers.Accept, 'application/json');
  });

  it('points the next page at the relay', async () => {
    const answer = await worker.fetch(request('/api/posts?page=1'), ENV);
    const body = await answer.json();

    assert.equal(answer.status, 200);
    assert.deepEqual(body.data, [{ id: '19' }]);
    assert.equal(body.links.next, `${RELAY}/api/posts?page%5Bcursor%5D=abc`);
  });

  it('passes on what Patreon refuses', async () => {
    patreon.mock.mockImplementation(() =>
      Promise.resolve(
        new Response('{"errors":[{"status":"403"}]}', { status: 403 }),
      ),
    );

    const answer = await worker.fetch(request('/api/posts'), ENV);

    assert.equal(answer.status, 403);
    assert.equal(await answer.text(), '{"errors":[{"status":"403"}]}');
  });
});
