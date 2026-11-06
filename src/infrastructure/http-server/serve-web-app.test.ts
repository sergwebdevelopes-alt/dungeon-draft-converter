import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import type http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import zlib from 'node:zlib';
import express from 'express';
import { serveWebApp, type PageFor } from './serve-web-app.ts';

const INDEX_HTML = '<!doctype html><div id="root"></div>';
const SCRIPT = 'console.log("lair");';

async function listen(app: express.Express): Promise<http.Server> {
  return new Promise((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });
}

describe('spaFallback', () => {
  let server: http.Server;
  let base: string;
  let tmp: string;

  before(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'spa-'));
    const dir = path.join(tmp, 'web');
    await fs.mkdir(path.join(dir, 'converter'), { recursive: true });
    await fs.mkdir(path.join(dir, 'assets'));
    await fs.writeFile(path.join(dir, 'index.html'), INDEX_HTML);
    await fs.writeFile(path.join(dir, 'converter', 'preview.webp'), 'image');

    const script = path.join(dir, 'assets', 'index-abc.js');
    await fs.writeFile(script, SCRIPT);
    await fs.writeFile(`${script}.br`, zlib.brotliCompressSync(SCRIPT));
    await fs.writeFile(`${script}.gz`, zlib.gzipSync(SCRIPT));
    await fs.writeFile(
      path.join(tmp, 'secret.js.br'),
      zlib.brotliCompressSync('secret'),
    );

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
    await fs.rm(tmp, { recursive: true, force: true });
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
    const res = await fetch(`${base}/converter`, { redirect: 'manual' });

    assert.equal(res.status, 200);
    assert.equal(await res.text(), INDEX_HTML);
  });

  it('still serves files from that folder', async () => {
    const res = await fetch(`${base}/converter/preview.webp`);

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

  it('serves the brotli copy of a build file when the browser accepts it', async () => {
    const res = await fetch(`${base}/assets/index-abc.js`, {
      headers: { 'Accept-Encoding': 'gzip, deflate, br' },
    });

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-encoding'), 'br');
    assert.match(res.headers.get('content-type') ?? '', /javascript/);
    assert.equal(res.headers.get('vary'), 'Accept-Encoding');
    assert.equal(await res.text(), SCRIPT);
  });

  it('falls back to gzip, then to the plain file', async () => {
    const gzipped = await fetch(`${base}/assets/index-abc.js`, {
      headers: { 'Accept-Encoding': 'gzip, br;q=0' },
    });
    const plain = await fetch(`${base}/assets/index-abc.js`, {
      headers: { 'Accept-Encoding': 'identity' },
    });

    assert.equal(gzipped.headers.get('content-encoding'), 'gzip');
    assert.equal(await gzipped.text(), SCRIPT);
    assert.equal(plain.headers.get('content-encoding'), null);
    assert.equal(await plain.text(), SCRIPT);
  });

  it('never serves files from outside the web folder', async () => {
    const res = await fetch(`${base}/..%2fsecret.js`, {
      headers: { 'Accept-Encoding': 'br' },
    });

    assert.notEqual(await res.text(), 'secret');
  });

  it('caches build files for good and other files briefly', async () => {
    const cases = [
      ['/assets/index-abc.js', 'public, max-age=31536000, immutable'],
      ['/converter/preview.webp', 'public, max-age=86400'],
      ['/converter', 'no-cache'],
    ];

    for (const [route, expected] of cases) {
      const res = await fetch(base + route);
      await res.arrayBuffer();

      assert.equal(res.headers.get('cache-control'), expected, route);
    }
  });
});

const TEMPLATE = [
  '<!doctype html><head>',
  '<!-- page-head --><title>Default</title><!-- /page-head -->',
  '</head><div id="root"></div>',
].join('');

const pageFor: PageFor = (req) =>
  req.path === '/broken'
    ? Promise.reject(new Error('lookup failed'))
    : Promise.resolve({
        status: req.path === '/missing' ? 404 : 200,
        head: {
          title: `Page ${req.path}`,
          description: 'About it.',
          url: `https://lair.test${req.originalUrl}`,
          image: { url: 'https://lair.test/og-image.jpg', alt: 'Lair' },
        },
      });

describe('serveWebApp with page heads', () => {
  let server: http.Server;
  let base: string;
  let tmp: string;

  before(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'spa-head-'));
    await fs.writeFile(path.join(tmp, 'index.html'), TEMPLATE);
    await fs.writeFile(
      path.join(tmp, 'index.html.br'),
      zlib.brotliCompressSync(TEMPLATE),
    );

    const app = express();
    app.use(serveWebApp(tmp, pageFor));
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

    server = await listen(app);
    const { port } = server.address() as { port: number };
    base = `http://localhost:${port}`;
  });

  after(async () => {
    server.closeAllConnections();
    server.close();
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it('fills the head of every page, the home page included', async () => {
    for (const route of ['/', '/maps?map=ice-cave']) {
      const res = await fetch(base + route, {
        headers: { 'Accept-Encoding': 'br' },
      });
      const html = await res.text();

      assert.equal(res.status, 200, route);
      assert.match(res.headers.get('content-type') ?? '', /text\/html/);
      assert.equal(res.headers.get('cache-control'), 'no-cache');
      assert.equal(res.headers.get('content-encoding'), null);
      assert.doesNotMatch(html, /Default/);
      assert.ok(
        html.includes(`<title>Page ${new URL(base + route).pathname}</title>`),
      );
      assert.ok(html.includes(`href="https://lair.test${route}"`));
      assert.ok(html.endsWith('</head><div id="root"></div>'));
    }
  });

  it('answers with the status the page asks for', async () => {
    const res = await fetch(`${base}/missing`);

    assert.equal(res.status, 404);
    assert.ok((await res.text()).includes('<title>Page /missing</title>'));
  });

  it('passes a failed lookup on as an error', async () => {
    const res = await fetch(`${base}/broken`);

    assert.equal(res.status, 500);
    assert.deepEqual(await res.json(), { error: 'lookup failed' });
  });
});
