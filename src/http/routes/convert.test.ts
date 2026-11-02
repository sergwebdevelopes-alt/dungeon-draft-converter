import assert from 'node:assert/strict';
import http from 'node:http';
import { after, before, describe, it } from 'node:test';
import express from 'express';
import { ConversionQueue, PendingLimit } from '../../queue/index.ts';
import { errorHandler } from '../errors.ts';
import { convertRouter } from './convert.ts';

const BUSY_MESSAGE =
  'The server is busy converting other maps. Please try again in a minute.';

describe('convertRouter', () => {
  let server: http.Server;
  let base: string;
  let pendingLimit: PendingLimit;

  before(async () => {
    const queue = new ConversionQueue({ maxParallel: 1 });
    pendingLimit = new PendingLimit(1);
    const app = express();
    app.use(convertRouter(queue, pendingLimit));
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

  function postEmptyForm(query = ''): Promise<Response> {
    return fetch(`${base}/convert${query}`, {
      method: 'POST',
      body: new FormData(),
    });
  }

  async function placeIsFree(): Promise<boolean> {
    const deadline = Date.now() + 5_000;
    let release = pendingLimit.reserve();

    while (!release && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 10));
      release = pendingLimit.reserve();
    }

    release?.();
    return release !== undefined;
  }

  it('refuses with 503 and Retry-After when every place is taken', async () => {
    const release = pendingLimit.reserve();
    assert.ok(release);

    try {
      const res = await postEmptyForm();

      assert.equal(res.status, 503);
      assert.equal(res.headers.get('retry-after'), '30');
      assert.equal(res.headers.get('connection'), 'close');
      assert.deepEqual(await res.json(), { error: BUSY_MESSAGE });
    } finally {
      release();
    }
  });

  it('does not take a place when it refuses', async () => {
    const release = pendingLimit.reserve();
    assert.ok(release);

    const res = await postEmptyForm();
    await res.arrayBuffer();
    release();

    assert.equal(res.status, 503);
    assert.ok(await placeIsFree());
  });

  it('runs the upload checks after taking a place', async () => {
    const res = await postEmptyForm();

    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), {
      error: 'Please upload a .dd2vtt map file.',
    });
  });

  it('gives the place back when a request is rejected', async () => {
    const res = await postEmptyForm('?presets=nope');
    await res.arrayBuffer();

    assert.equal(res.status, 400);
    assert.ok(await placeIsFree());
  });

  it('gives the place back after a missing upload size', async () => {
    const res = await new Promise<http.IncomingMessage>((resolve, reject) => {
      const { port } = server.address() as { port: number };
      const req = http.request(
        {
          port,
          method: 'POST',
          path: '/convert',
          headers: { 'Transfer-Encoding': 'chunked' },
        },
        resolve,
      );
      req.on('error', reject);
      req.end('x');
    });
    res.resume();

    assert.equal(res.statusCode, 411);
    assert.ok(await placeIsFree());
  });

  it('accepts the next request once the place is free again', async () => {
    const first = await postEmptyForm();
    await first.arrayBuffer();
    const second = await postEmptyForm();
    await second.arrayBuffer();

    assert.equal(first.status, 400);
    assert.equal(second.status, 400);
  });
});
