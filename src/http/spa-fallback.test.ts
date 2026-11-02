import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import type http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import express from 'express';
import { serveWebApp } from './spa-fallback.ts';

const INDEX_HTML = '<!doctype html><div id="root"></div>';

async function listen(app: express.Express): Promise<http.Server> {
  return new Promise((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });
}

describe('spaFallback', () => {
  let server: http.Server;
  let base: string;
  let dir: string;

  before(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'spa-'));
    await fs.writeFile(path.join(dir, 'index.html'), INDEX_HTML);
    await fs.mkdir(path.join(dir, 'maps', 'cave'), { recursive: true });
    await fs.writeFile(path.join(dir, 'maps', 'cave', 'card.webp'), 'image');

    const app = express();
    app.use(serveWebApp(dir));
    app.use((_req, res) => {
      res.status(404).json({ error: 'Not found.' });
    });

    server = await listen(app);
    const { port } = server.address() as { port: number };
    base = `http://localhost:${port}`;
  });

  after(async () => {
    server.closeAllConnections();
    server.close();
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('serves the page for app routes', async () => {
    for (const route of [
      '/converter',
      '/maps',
      '/maps?map=frozen-cavern',
      '/no/such/page',
    ]) {
      const res = await fetch(base + route);

      assert.equal(res.status, 200, route);
      assert.match(res.headers.get('content-type') ?? '', /text\/html/);
      assert.equal(await res.text(), INDEX_HTML);
    }
  });

  it('serves the page for a route that shares its name with a folder', async () => {
    const res = await fetch(`${base}/maps`, { redirect: 'manual' });

    assert.equal(res.status, 200);
    assert.equal(await res.text(), INDEX_HTML);
  });

  it('still serves files from that folder', async () => {
    const res = await fetch(`${base}/maps/cave/card.webp`);

    assert.equal(res.status, 200);
    assert.equal(await res.text(), 'image');
  });

  it('leaves API paths alone', async () => {
    const res = await fetch(`${base}/api/unknown`);

    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { error: 'Not found.' });
  });

  it('leaves missing files alone', async () => {
    const res = await fetch(`${base}/assets/missing.js`);

    assert.equal(res.status, 404);
  });

  it('only answers reads', async () => {
    const res = await fetch(`${base}/converter`, { method: 'POST' });

    assert.equal(res.status, 404);
  });
});
