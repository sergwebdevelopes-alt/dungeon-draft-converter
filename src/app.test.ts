import assert from 'node:assert/strict';
import http from 'node:http';
import { after, before, beforeEach, describe, it } from 'node:test';

process.env.NODE_ENV = 'production';

const { createApp } = await import('./app.ts');
const { MAX_UPLOAD_BYTES } = await import('./config.ts');

type GalleryStores =
  import('./features/gallery/ports/gallery-stores.ts').GalleryStores;

describe('createApp', () => {
  let server: http.Server;
  let base: string;
  let shuttingDown: boolean;

  before(async () => {
    server = http.createServer();
    const app = await createApp(server, {
      isShuttingDown: () => shuttingDown,
      logConversion: () => undefined,
    });
    server.on('request', app);

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as { port: number };
    base = `http://localhost:${port}`;
  });

  after(() => {
    server.closeAllConnections();
    server.close();
  });

  beforeEach(() => {
    shuttingDown = false;
  });

  it('serves the config under /api', async () => {
    const res = await fetch(`${base}/api/config`);
    const body = (await res.json()) as { maxUploadBytes: number };

    assert.equal(res.status, 200);
    assert.equal(body.maxUploadBytes, MAX_UPLOAD_BYTES);
  });

  it('reports health under /api, and 503 while shutting down', async () => {
    const up = await fetch(`${base}/api/health`);
    assert.equal(up.status, 200);
    assert.deepEqual(await up.json(), { ok: true });

    shuttingDown = true;
    const down = await fetch(`${base}/api/health`);
    assert.equal(down.status, 503);
    assert.deepEqual(await down.json(), { ok: false });
  });

  it('answers unknown /api paths with a JSON 404', async () => {
    const res = await fetch(`${base}/api/nope`);

    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { error: 'Not found.' });
  });

  it('serves queue positions under /api', async () => {
    const res = await fetch(`${base}/api/queue/x`);

    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { state: 'unknown' });
  });

  it('adds the security headers to /api responses', async () => {
    const res = await fetch(`${base}/api/config`);

    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
    assert.ok(res.headers.get('content-security-policy'));
    assert.equal(res.headers.get('x-powered-by'), null);
  });

  it('refuses a cross-site conversion', async () => {
    const res = await fetch(`${base}/api/convert`, {
      method: 'POST',
      headers: { 'Sec-Fetch-Site': 'cross-site' },
      body: new FormData(),
    });

    assert.equal(res.status, 403);
    assert.deepEqual(await res.json(), {
      error: 'Requests from other websites are not allowed.',
    });
  });

  it('refuses a conversion during shutdown', async () => {
    shuttingDown = true;

    const res = await fetch(`${base}/api/convert`, {
      method: 'POST',
      body: new FormData(),
    });

    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), {
      error: 'The server is restarting. Please try again in a minute.',
    });
  });

  it('routes a same-origin conversion to the convert handler', async () => {
    const res = await fetch(`${base}/api/convert`, {
      method: 'POST',
      headers: { 'Sec-Fetch-Site': 'same-origin' },
      body: new FormData(),
    });

    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), {
      error: 'Please upload a .dd2vtt map file.',
    });
  });
});

describe('createApp error reports', () => {
  it('reports an unexpected failure of a request and still answers 500', async () => {
    const reported: unknown[] = [];
    const failure = new Error('The database is gone.');
    const server = http.createServer();
    const app = await createApp(server, {
      isShuttingDown: () => false,
      logConversion: () => undefined,
      galleryStores: {
        maps: { listTags: () => Promise.reject(failure) },
      } as unknown as GalleryStores,
      errorReporter: {
        report: (error, context) => reported.push([error, context]),
      },
    });
    server.on('request', app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as { port: number };
    const logError = console.error;
    console.error = () => undefined;

    try {
      const res = await fetch(`http://localhost:${port}/api/maps?limit=5`);

      assert.equal(res.status, 500);
      assert.deepEqual(reported, [
        [failure, { where: 'http', method: 'GET', path: '/api/maps' }],
      ]);
    } finally {
      console.error = logError;
      server.closeAllConnections();
      server.close();
    }
  });
});
