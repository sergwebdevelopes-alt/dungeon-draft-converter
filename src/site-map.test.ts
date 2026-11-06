import assert from 'node:assert/strict';
import type http from 'node:http';
import { after, before, describe, it } from 'node:test';
import express from 'express';
import type { ListMapLinks } from './features/gallery/http/map-page.ts';
import { createSitemapRoute } from './site-map.ts';

let failing = false;

const listMapLinks: ListMapLinks = () =>
  failing
    ? Promise.reject(new Error('database down'))
    : Promise.resolve([
        { path: '/maps?map=ice-cave', publishedAt: '2026-10-12T07:08:36.000Z' },
      ]);

describe('createSitemapRoute', () => {
  let server: http.Server;
  let base: string;

  before(async () => {
    const app = express();
    app.get(
      '/sitemap.xml',
      createSitemapRoute('https://lair.test', listMapLinks),
    );
    app.use(
      (
        error: Error,
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction,
      ) => {
        res.status(500).json({ error: error.message });
      },
    );

    server = await new Promise((resolve) => {
      const listening = app.listen(0, () => resolve(listening));
    });
    const { port } = server.address() as { port: number };
    base = `http://localhost:${port}`;
  });

  after(() => {
    server.closeAllConnections();
    server.close();
  });

  it('lists the site pages and every map at their full addresses', async () => {
    failing = false;
    const res = await fetch(`${base}/sitemap.xml`);
    const xml = await res.text();

    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') ?? '', /^application\/xml/);
    assert.equal(res.headers.get('cache-control'), 'no-cache');
    assert.deepEqual(
      [...xml.matchAll(/<url>(.*?)<\/url>/g)].map((match) => match[1]),
      [
        '<loc>https://lair.test/</loc>',
        '<loc>https://lair.test/maps</loc>',
        '<loc>https://lair.test/converter</loc>',
        '<loc>https://lair.test/maps?map=ice-cave</loc><lastmod>2026-10-12T07:08:36.000Z</lastmod>',
      ],
    );
  });

  it('passes a failed map list on as an error', async () => {
    failing = true;
    const res = await fetch(`${base}/sitemap.xml`);

    assert.equal(res.status, 500);
    assert.deepEqual(await res.json(), { error: 'database down' });
  });
});
