import assert from 'node:assert/strict';
import type http from 'node:http';
import { after, before, describe, it } from 'node:test';
import express from 'express';
import { healthRouter } from './health-route.ts';

describe('healthRouter', () => {
  let server: http.Server;
  let base: string;
  let shuttingDown = false;

  before(async () => {
    const app = express();
    app.use(healthRouter(() => shuttingDown));

    server = await new Promise<http.Server>((resolve) => {
      const listening = app.listen(0, () => resolve(listening));
    });
    const { port } = server.address() as { port: number };
    base = `http://localhost:${port}`;
  });

  after(() => {
    server.closeAllConnections();
    server.close();
  });

  it('says the server is up, and is never cached', async () => {
    shuttingDown = false;

    const res = await fetch(`${base}/health`);

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await res.json(), { ok: true });
  });

  it('reports 503 while the server shuts down', async () => {
    shuttingDown = true;

    const res = await fetch(`${base}/health`);

    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), { ok: false });
  });
});
