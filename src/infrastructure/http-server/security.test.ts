import assert from 'node:assert/strict';
import type http from 'node:http';
import { after, before, describe, it } from 'node:test';
import express from 'express';

delete process.env.NODE_ENV;

const { errorHandler } = await import('./http-errors.ts');
const { blockCrossSiteRequests, securityHeaders } =
  await import('./security.ts');

const BASE_HEADERS = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
};

const CROSS_SITE_MESSAGE = 'Requests from other websites are not allowed.';

async function listen(app: express.Express): Promise<http.Server> {
  return new Promise((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });
}

function baseOf(server: http.Server): string {
  const { port } = server.address() as { port: number };

  return `http://localhost:${port}`;
}

function stop(server: http.Server): void {
  server.closeAllConnections();
  server.close();
}

describe('securityHeaders outside production', () => {
  let server: http.Server;
  let base: string;

  before(async () => {
    const app = express();
    app.use(securityHeaders);
    app.get('/', (_req, res) => {
      res.send('ok');
    });
    app.use(errorHandler);

    server = await listen(app);
    base = baseOf(server);
  });

  after(() => stop(server));

  it('sets the base headers', async () => {
    const res = await fetch(base);

    for (const [name, value] of Object.entries(BASE_HEADERS)) {
      assert.equal(res.headers.get(name), value, name);
    }
  });

  it('sets the base headers on error responses too', async () => {
    const res = await fetch(`${base}/missing`);

    assert.equal(res.status, 404);
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
  });

  it('leaves out CSP and HSTS', async () => {
    const res = await fetch(base);

    assert.equal(res.headers.get('content-security-policy'), null);
    assert.equal(res.headers.get('strict-transport-security'), null);
  });
});

describe('blockCrossSiteRequests', () => {
  let server: http.Server;
  let base: string;

  before(async () => {
    const app = express();
    app.use(blockCrossSiteRequests);
    app.all('/', (_req, res) => {
      res.send('ok');
    });
    app.use(errorHandler);

    server = await listen(app);
    base = baseOf(server);
  });

  after(() => stop(server));

  function send(method: string, site?: string): Promise<Response> {
    const headers: Record<string, string> = site
      ? { 'Sec-Fetch-Site': site }
      : {};

    return fetch(base, { method, headers });
  }

  for (const site of ['cross-site', 'same-site']) {
    it(`refuses a ${site} POST`, async () => {
      const res = await send('POST', site);

      assert.equal(res.status, 403);
      assert.deepEqual(await res.json(), { error: CROSS_SITE_MESSAGE });
    });
  }

  it('refuses a cross-site DELETE', async () => {
    const res = await send('DELETE', 'cross-site');

    assert.equal(res.status, 403);
  });

  for (const site of ['same-origin', 'none']) {
    it(`allows a ${site} POST`, async () => {
      const res = await send('POST', site);

      assert.equal(res.status, 200);
      assert.equal(await res.text(), 'ok');
    });
  }

  it('allows a POST without Sec-Fetch-Site', async () => {
    const res = await send('POST');

    assert.equal(res.status, 200);
  });

  for (const method of ['GET', 'HEAD', 'OPTIONS']) {
    it(`allows a cross-site ${method}`, async () => {
      const res = await send(method, 'cross-site');

      assert.equal(res.status, 200);
    });
  }
});
