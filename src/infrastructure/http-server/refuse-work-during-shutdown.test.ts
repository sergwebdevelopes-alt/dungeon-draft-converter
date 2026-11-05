import assert from 'node:assert/strict';
import type http from 'node:http';
import { after, before, beforeEach, describe, it } from 'node:test';
import express from 'express';
import { errorHandler } from './http-errors.ts';
import { refuseNewWorkDuringShutdown } from './refuse-work-during-shutdown.ts';

const RESTART_MESSAGE =
  'The server is restarting. Please try again in a minute.';

describe('refuseNewWorkDuringShutdown', () => {
  let server: http.Server;
  let base: string;
  let shuttingDown: boolean;

  before(async () => {
    const app = express();
    app.use(refuseNewWorkDuringShutdown(() => shuttingDown));
    app.all('/', (_req, res) => {
      res.send('ok');
    });
    app.use(errorHandler);

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

  beforeEach(() => {
    shuttingDown = false;
  });

  it('lets every request through while running', async () => {
    for (const method of ['GET', 'POST']) {
      const res = await fetch(base, { method });

      assert.equal(res.status, 200, method);
      assert.equal(res.headers.get('connection'), 'keep-alive', method);
    }
  });

  it('refuses a POST with 503 during shutdown', async () => {
    shuttingDown = true;

    const res = await fetch(base, { method: 'POST' });

    assert.equal(res.status, 503);
    assert.equal(res.headers.get('connection'), 'close');
    assert.deepEqual(await res.json(), { error: RESTART_MESSAGE });
  });

  it('refuses other write methods during shutdown', async () => {
    shuttingDown = true;

    const res = await fetch(base, { method: 'PUT' });

    assert.equal(res.status, 503);
  });

  it('still serves GET, HEAD and OPTIONS during shutdown but closes the connection', async () => {
    shuttingDown = true;

    for (const method of ['GET', 'HEAD', 'OPTIONS']) {
      const res = await fetch(base, { method });

      assert.equal(res.status, 200, method);
      assert.equal(res.headers.get('connection'), 'close', method);
    }
  });

  it('checks the shutdown state on every request', async () => {
    shuttingDown = true;
    const refused = await fetch(base, { method: 'POST' });
    await refused.arrayBuffer();

    shuttingDown = false;
    const accepted = await fetch(base, { method: 'POST' });

    assert.equal(refused.status, 503);
    assert.equal(accepted.status, 200);
  });
});
