import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import type http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import express from 'express';
import { serveGalleryImages } from './gallery-images.ts';

async function listen(app: express.Express): Promise<http.Server> {
  return new Promise((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });
}

describe('serveGalleryImages', () => {
  let server: http.Server;
  let base: string;
  let dir: string;

  before(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'gallery-'));
    await fs.mkdir(path.join(dir, 'cave', 'v1'), { recursive: true });
    await fs.writeFile(path.join(dir, 'cave', 'v1', 'card.webp'), 'image');

    const app = express();
    app.use('/maps', serveGalleryImages(dir));
    app.use((_req, res) => {
      res.status(404).send('next handler');
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

  it('serves a versioned image to keep forever', async () => {
    const response = await fetch(`${base}/maps/cave/v1/card.webp?x=1`);

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'image/webp');
    assert.equal(
      response.headers.get('cache-control'),
      'public, max-age=31536000, immutable',
    );
    assert.equal(await response.text(), 'image');
  });

  it('passes missing files and folders on to the next handler', async () => {
    for (const urlPath of [
      '/maps',
      '/maps/',
      '/maps/cave',
      '/maps/cave/card.webp',
    ]) {
      const response = await fetch(`${base}${urlPath}`, { redirect: 'manual' });

      assert.equal(response.status, 404, urlPath);
      assert.equal(await response.text(), 'next handler', urlPath);
      assert.equal(response.headers.get('cache-control'), null, urlPath);
    }
  });

  it('never serves files outside its folder', async () => {
    const response = await fetch(`${base}/maps/..%2f..%2fetc%2fpasswd`);

    assert.notEqual(response.status, 200);
  });
});
