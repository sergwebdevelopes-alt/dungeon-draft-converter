import assert from 'node:assert/strict';
import type http from 'node:http';
import { after, before, describe, it } from 'node:test';
import express from 'express';
import { ConversionQueue } from '../../queue/index.ts';
import { queueRouter } from './queue.ts';

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

describe('queueRouter', () => {
  let server: http.Server;
  let base: string;
  let queue: ConversionQueue;

  before(async () => {
    queue = new ConversionQueue({ maxParallel: 1 });
    const app = express();
    app.use(queueRouter(queue));

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
