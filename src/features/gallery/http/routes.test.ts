import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import type http from 'node:http';
import { after, before, beforeEach, describe, it } from 'node:test';
import express from 'express';
import { errorHandler } from '../../../infrastructure/http-server/http-errors.ts';
import type { GallerySync } from '../application/sync-gallery.ts';
import type { ImageStorage } from '../ports/image-storage.ts';
import type { MapRepository, StoredMap } from '../ports/map-repository.ts';
import type { PatreonTokenRepository } from '../ports/patreon-token-repository.ts';
import type { GalleryStores } from '../ports/gallery-stores.ts';
import { createRoutes, type WebhookLogEntry } from './routes.ts';

function stored(postId: string, slug: string): StoredMap {
  return {
    postId,
    slug,
    title: slug,
    description: '',
    tags: [],
    patreonUrl: `https://www.patreon.com/posts/${postId}`,
    publishedAt: '2026-01-01T00:00:00.000Z',
    image: { url: 'u', width: 3, height: 2, mediaId: 'm' },
    checkedAt: '2026-11-04T00:00:00.000Z',
  };
}

function gallery(maps: StoredMap[]): GalleryStores {
  const store: MapRepository = {
    listMaps: () => Promise.resolve(maps),
    replaceMaps: () => Promise.resolve({ added: 0, updated: 0, removed: 0 }),
  };
  const images: ImageStorage = {
    has: () => Promise.resolve(true),
    put: () => Promise.resolve(),
    removeFolder: () => Promise.resolve(),
    urlFor: (key) => `/maps/${key}`,
  };

  const tokens: PatreonTokenRepository = {
    load: () => Promise.resolve(null),
    save: () => Promise.resolve(),
  };

  return { maps: store, images, tokens };
}

async function listen(app: express.Express): Promise<http.Server> {
  return new Promise((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });
}

async function serve(stores: GalleryStores | undefined) {
  const app = express();
  app.use(
    '/api',
    createRoutes({ stores, sync: undefined, webhookSecret: undefined }),
  );
  const server = await listen(app);
  const { port } = server.address() as { port: number };

  return { server, url: `http://localhost:${port}/api/maps` };
}

describe('GET /api/maps', () => {
  const servers: http.Server[] = [];

  after(() => {
    for (const server of servers) {
      server.closeAllConnections();
      server.close();
    }
  });

  let url: string;

  before(async () => {
    const served = await serve(
      gallery([stored('2', 'new'), stored('1', 'old')]),
    );
    servers.push(served.server);
    url = served.url;
  });

  it('lists the maps in the stored order with their image URLs', async () => {
    const res = await fetch(url);
    const body = (await res.json()) as {
      maps: { slug: string; images: { card: string } }[];
    };

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('cache-control'), 'no-cache');
    assert.deepEqual(
      body.maps.map((map) => [map.slug, map.images.card]),
      [
        ['new', '/maps/2/m/card.webp'],
        ['old', '/maps/1/m/card.webp'],
      ],
    );
  });

  it('answers 304 when the list has not changed', async () => {
    const etag = (await fetch(url)).headers.get('etag');

    const res = await fetch(url, {
      headers: { 'If-None-Match': etag ?? '', 'Cache-Control': 'max-age=0' },
    });

    assert.ok(etag);
    assert.equal(res.status, 304);
  });

  it('lists no maps without a database', async () => {
    const served = await serve(undefined);
    servers.push(served.server);

    const res = await fetch(served.url);

    assert.deepEqual(await res.json(), { maps: [] });
  });
});

const SECRET = 'webhook-secret';
const BODY = '{"data":{"id":"172779058","type":"post"}}';

function sign(body: string): string {
  return createHmac('md5', SECRET).update(body).digest('hex');
}

describe('POST /api/patreon/webhook', () => {
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
      createRoutes({
        stores: undefined,
        webhookSecret: secret,
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
