import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import type http from 'node:http';
import { after, before, beforeEach, describe, it } from 'node:test';
import express from 'express';
import type { GallerySync } from '../../gallery/sync.ts';
import { errorHandler } from '../errors.ts';
import {
  patreonWebhookRouter,
  type WebhookLogEntry,
} from './patreon-webhook.ts';

const SECRET = 'webhook-secret';
const BODY = '{"data":{"id":"172779058","type":"post"}}';

function sign(body: string): string {
  return createHmac('md5', SECRET).update(body).digest('hex');
}

async function listen(app: express.Express): Promise<http.Server> {
  return new Promise((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });
}

describe('patreonWebhookRouter', () => {
  const servers: http.Server[] = [];
  let runs: number;
  let logs: WebhookLogEntry[];
  const sync: GallerySync = {
    run() {
      runs += 1;
      return Promise.resolve();
    },
  };

  async function serve(secret: string | undefined, withSync = true) {
    const app = express();
    app.use(
      '/api',
      patreonWebhookRouter({
        secret,
        sync: withSync ? sync : undefined,
        log: (entry) => logs.push(entry),
      }),
    );
    app.use(errorHandler);
    const server = await listen(app);
    servers.push(server);
    const { port } = server.address() as { port: number };

    return `http://localhost:${port}/api/patreon/webhook`;
  }

  function send(
    url: string,
    { body = BODY, event = 'posts:update', signature = sign(BODY) } = {},
  ) {
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Patreon-Event': event,
        'X-Patreon-Signature': signature,
      },
      body,
    });
  }

  let url: string;

  before(async () => {
    url = await serve(SECRET);
  });

  beforeEach(() => {
    runs = 0;
    logs = [];
  });

  after(() => {
    for (const server of servers) {
      server.closeAllConnections();
      server.close();
    }
  });

  it('starts a sync for a signed post event and answers at once', async () => {
    const res = await send(url, { event: 'posts:publish' });

    assert.equal(res.status, 202);
    assert.deepEqual(await res.json(), { ok: true });
    assert.equal(runs, 1);
    assert.deepEqual(logs, [
      { event: 'patreon-webhook', trigger: 'posts:publish', result: 'sync' },
    ]);
  });

  it('accepts other signed events without a sync', async () => {
    const res = await send(url, { event: 'members:create' });

    assert.equal(res.status, 202);
    assert.equal(runs, 0);
    assert.deepEqual(logs, [
      {
        event: 'patreon-webhook',
        trigger: 'members:create',
        result: 'ignored',
      },
    ]);
  });

  it('refuses a wrong or missing signature without a sync', async () => {
    for (const signature of ['00112233445566778899aabbccddeeff', '']) {
      const res = await send(url, { signature });

      assert.equal(res.status, 401, signature);
      assert.deepEqual(await res.json(), {
        error: 'The webhook signature is not valid.',
      });
    }
    const changed = await send(url, { body: `${BODY} ` });

    assert.equal(changed.status, 401);
    assert.equal(runs, 0);
    assert.deepEqual(logs, []);
  });

  it('refuses a body over 1 MB', async () => {
    const big = 'a'.repeat(1024 * 1024 + 1);

    const res = await send(url, { body: big, signature: sign(big) });

    assert.equal(res.status, 413);
    assert.deepEqual(await res.json(), {
      error: 'The webhook body is too large.',
    });
    assert.equal(runs, 0);
  });

  it('is not there without a secret or a sync', async () => {
    for (const other of [await serve(undefined), await serve(SECRET, false)]) {
      const res = await send(other);

      assert.equal(res.status, 404);
    }
    assert.equal(runs, 0);
  });
});
