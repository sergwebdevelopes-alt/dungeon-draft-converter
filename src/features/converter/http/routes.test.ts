import assert from 'node:assert/strict';
import http from 'node:http';
import { after, before, describe, it } from 'node:test';
import express from 'express';
import {
  MAX_LEVELS,
  MAX_LOGO_BYTES,
  MAX_TOTAL_UPLOAD_BYTES,
  MAX_UPLOAD_BYTES,
} from '../../../config.ts';
import { errorHandler } from '../../../infrastructure/http-server/http-errors.ts';
import { ConversionQueue } from '../application/conversion-queue.ts';
import { PendingLimit } from '../application/pending-limit.ts';
import {
  FORMAT_PRESETS,
  LOGO_LIMITS,
  VARIANTS,
} from '../image-processing/render-map-images.ts';
import type { ConversionLogEntry } from './conversion-log.ts';
import { createRoutes } from './routes.ts';

describe('GET /api/config', () => {
  let server: http.Server;
  let base: string;

  before(async () => {
    const app = express();
    app.use(
      createRoutes({
        queue: new ConversionQueue({ maxParallel: 1 }),
        pendingLimit: new PendingLimit(1),
      }),
    );

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

  it('returns the presets, variants and limits the client needs', async () => {
    const res = await fetch(`${base}/config`);

    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') ?? '', /application\/json/);
    assert.deepEqual(await res.json(), {
      presets: FORMAT_PRESETS,
      variants: VARIANTS,
      maxUploadBytes: MAX_UPLOAD_BYTES,
      maxTotalUploadBytes: MAX_TOTAL_UPLOAD_BYTES,
      maxLevels: MAX_LEVELS,
      maxLogoBytes: MAX_LOGO_BYTES,
      logo: LOGO_LIMITS,
    });
  });

  it('lists at least one preset and both variants', async () => {
    const res = await fetch(`${base}/config`);
    const body = (await res.json()) as {
      presets: unknown[];
      variants: string[];
    };

    assert.ok(body.presets.length > 0);
    assert.deepEqual(body.variants, ['NoGrid', 'Grid']);
  });
});

const TICKET_A = 'a'.repeat(32);
const TICKET_B = 'b'.repeat(32);
const TICKET_C = 'c'.repeat(32);

interface HeldTask {
  finish: () => void;
  done: Promise<void>;
}

function holdTask(
  queue: ConversionQueue,
  ticket: string,
  signal: AbortSignal,
): HeldTask {
  let finish = () => {};
  const task = () =>
    new Promise<void>((resolve) => {
      finish = resolve;
    });

  return {
    finish: () => finish(),
    done: queue.run(task, { ticket, signal }),
  };
}

describe('GET /api/queue/:ticket', () => {
  let server: http.Server;
  let base: string;
  let queue: ConversionQueue;

  before(async () => {
    queue = new ConversionQueue({ maxParallel: 1 });
    const app = express();
    app.use(createRoutes({ queue, pendingLimit: new PendingLimit(1) }));

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

  async function positionOf(ticket: string): Promise<unknown> {
    const res = await fetch(`${base}/queue/${ticket}`);

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('cache-control'), 'no-store');

    return res.json();
  }

  it('reports an unknown ticket', async () => {
    assert.deepEqual(await positionOf(TICKET_A), { state: 'unknown' });
  });

  it('reports converting and waiting tickets with their place in line', async () => {
    const stop = new AbortController();
    const first = holdTask(queue, TICKET_A, stop.signal);
    const second = holdTask(queue, TICKET_B, stop.signal);
    const third = holdTask(queue, TICKET_C, stop.signal);

    try {
      assert.deepEqual(await positionOf(TICKET_A), { state: 'converting' });
      assert.deepEqual(await positionOf(TICKET_B), {
        state: 'waiting',
        ahead: 1,
      });
      assert.deepEqual(await positionOf(TICKET_C), {
        state: 'waiting',
        ahead: 2,
      });
    } finally {
      stop.abort();
      first.finish();
      await Promise.all([first.done, second.done, third.done]);
    }
  });

  it('forgets a ticket once its conversion is cancelled', async () => {
    const stop = new AbortController();
    const held = holdTask(queue, TICKET_A, stop.signal);

    assert.deepEqual(await positionOf(TICKET_A), { state: 'converting' });

    stop.abort();
    held.finish();
    await held.done;

    assert.deepEqual(await positionOf(TICKET_A), { state: 'unknown' });
  });
});

const BUSY_MESSAGE =
  'The server is busy converting other maps. Please try again in a minute.';

describe('POST /api/convert', () => {
  let server: http.Server;
  let base: string;
  let pendingLimit: PendingLimit;
  const logged: ConversionLogEntry[] = [];

  before(async () => {
    const queue = new ConversionQueue({ maxParallel: 1 });
    pendingLimit = new PendingLimit(1);
    const app = express();
    app.use(
      createRoutes({
        queue,
        pendingLimit,
        log: (entry) => logged.push(entry),
      }),
    );
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

  it('keeps the place held by another request when it refuses', async () => {
    const release = pendingLimit.reserve();
    assert.ok(release);

    try {
      const res = await postEmptyForm();
      await res.arrayBuffer();
      await new Promise((resolve) => setTimeout(resolve, 50));

      assert.equal(res.status, 503);
      assert.equal(pendingLimit.reserve(), undefined);
    } finally {
      release();
    }
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

  async function waitForLogs(count: number): Promise<void> {
    const deadline = Date.now() + 5_000;
    while (logged.length < count && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  it('logs refused and invalid requests too', async () => {
    const before = logged.length;
    const release = pendingLimit.reserve();
    assert.ok(release);
    try {
      await (await postEmptyForm()).arrayBuffer();
    } finally {
      release();
    }
    await (await postEmptyForm()).arrayBuffer();
    await waitForLogs(before + 2);

    assert.deepEqual(
      logged.slice(before).map(({ result, status }) => ({ result, status })),
      [
        { result: 'busy', status: 503 },
        { result: 'invalid', status: 400 },
      ],
    );
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
