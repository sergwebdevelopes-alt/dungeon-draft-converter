import assert from 'node:assert/strict';
import type http from 'node:http';
import { after, before, describe, it } from 'node:test';
import express from 'express';
import type { ImageStore } from '../../gallery/image-store.ts';
import type { MapStore, StoredMap } from '../../gallery/map-store.ts';
import type { TokenStore } from '../../gallery/patreon/token-store.ts';
import type { GalleryStores } from '../../gallery/setup.ts';
import { mapsRouter } from './maps.ts';

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
  const store: MapStore = {
    listMaps: () => Promise.resolve(maps),
    replaceMaps: () => Promise.resolve({ added: 0, updated: 0, removed: 0 }),
  };
  const images: ImageStore = {
    has: () => Promise.resolve(true),
    put: () => Promise.resolve(),
    removeFolder: () => Promise.resolve(),
    urlFor: (key) => `/maps/${key}`,
  };

  const tokens: TokenStore = {
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
  app.use('/api', mapsRouter(stores));
  const server = await listen(app);
  const { port } = server.address() as { port: number };

  return { server, url: `http://localhost:${port}/api/maps` };
}

describe('mapsRouter', () => {
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
