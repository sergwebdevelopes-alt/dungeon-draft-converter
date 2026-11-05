import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ConversionQueue } from './conversion-queue.ts';

interface Gate {
  promise: Promise<void>;
  open: () => void;
}

function gate(): Gate {
  let open = () => undefined as void;
  const promise = new Promise<void>((resolve) => {
    open = resolve;
  });

  return { promise, open };
}

function settle(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

function makeQueue(maxParallel = 1): ConversionQueue {
  return new ConversionQueue({ maxParallel });
}

function startTask(
  queue: ConversionQueue,
  name: string,
  started: string[],
  ticket?: string,
) {
  const finish = gate();
  const request = new AbortController();
  const done = queue.run(
    async () => {
      started.push(name);
      await finish.promise;
    },
    { ticket, signal: request.signal },
  );

  return { finish: finish.open, leave: () => request.abort(), done };
}

describe('ConversionQueue', () => {
  describe('running conversions', () => {
    it('runs one conversion at a time when maxParallel is 1', async () => {
      const queue = makeQueue(1);
      const started: string[] = [];

      const a = startTask(queue, 'a', started);
      const b = startTask(queue, 'b', started);
      await settle();

      assert.deepEqual(started, ['a']);

      a.finish();
      await a.done;
      await settle();

      assert.deepEqual(started, ['a', 'b']);

      b.finish();
      await b.done;
    });

    it('runs up to maxParallel conversions at once', async () => {
      const queue = makeQueue(2);
      const started: string[] = [];

      const a = startTask(queue, 'a', started);
      const b = startTask(queue, 'b', started);
      const c = startTask(queue, 'c', started);
      await settle();

      assert.deepEqual(started, ['a', 'b']);

      b.finish();
      await b.done;
      await settle();

      assert.deepEqual(started, ['a', 'b', 'c']);

      a.finish();
      c.finish();
      await Promise.all([a.done, c.done]);
    });

    it('starts waiting conversions in the order they arrived', async () => {
      const queue = makeQueue(1);
      const started: string[] = [];

      const tasks = ['a', 'b', 'c', 'd'].map((name) =>
        startTask(queue, name, started),
      );

      for (const task of tasks) {
        await settle();
        task.finish();
        await task.done;
      }

      assert.deepEqual(started, ['a', 'b', 'c', 'd']);
    });

    it('keeps going after a conversion fails', async () => {
      const queue = makeQueue(1);
      const started: string[] = [];

      const failing = queue.run(
        () => Promise.reject(new Error('conversion failed')),
        { signal: new AbortController().signal },
      );
      const next = startTask(queue, 'next', started);

      await assert.rejects(failing, { message: 'conversion failed' });
      await settle();
      assert.deepEqual(started, ['next']);

      next.finish();
      await next.done;
    });
  });

  describe('leaving the line', () => {
    it('lets a waiting request leave at once, before its turn', async () => {
      const queue = makeQueue(1);
      const started: string[] = [];

      const a = startTask(queue, 'a', started);
      const b = startTask(queue, 'b', started);
      await settle();

      b.leave();
      await b.done;

      assert.deepEqual(started, ['a']);

      a.finish();
      await a.done;
    });

    it('passes the slot to the next request after one left', async () => {
      const queue = makeQueue(1);
      const started: string[] = [];

      const a = startTask(queue, 'a', started);
      const b = startTask(queue, 'b', started);
      const c = startTask(queue, 'c', started);
      await settle();

      b.leave();
      a.finish();
      await Promise.all([a.done, b.done]);
      await settle();

      assert.deepEqual(started, ['a', 'c']);

      c.finish();
      await c.done;
    });

    it('never runs a request that had already left', async () => {
      const queue = makeQueue(1);
      const request = new AbortController();
      request.abort();
      let ran = false;

      await queue.run(
        () => {
          ran = true;
          return Promise.resolve();
        },
        { ticket: 'A', signal: request.signal },
      );

      assert.equal(ran, false);
      assert.deepEqual(queue.position('A'), { state: 'unknown' });
    });

    it('keeps the slot until a running conversion ends, even after it is stopped', async () => {
      const queue = makeQueue(1);
      const started: string[] = [];

      const a = startTask(queue, 'a', started);
      const b = startTask(queue, 'b', started);
      await settle();

      a.leave();
      await settle();

      assert.deepEqual(started, ['a']);

      a.finish();
      await a.done;
      await settle();

      assert.deepEqual(started, ['a', 'b']);

      b.finish();
      await b.done;
    });
  });

  describe('positions', () => {
    it('reports waiting, converting and unknown', async () => {
      const queue = makeQueue(1);
      const started: string[] = [];

      const a = startTask(queue, 'a', started, 'A');
      const b = startTask(queue, 'b', started, 'B');
      const c = startTask(queue, 'c', started, 'C');
      await settle();

      assert.deepEqual(queue.position('A'), { state: 'converting' });
      assert.deepEqual(queue.position('B'), { state: 'waiting', ahead: 1 });
      assert.deepEqual(queue.position('C'), { state: 'waiting', ahead: 2 });
      assert.deepEqual(queue.position('X'), { state: 'unknown' });

      a.finish();
      await a.done;
      await settle();

      assert.deepEqual(queue.position('A'), { state: 'unknown' });
      assert.deepEqual(queue.position('B'), { state: 'converting' });
      assert.deepEqual(queue.position('C'), { state: 'waiting', ahead: 1 });

      for (const task of [b, c]) {
        task.finish();
        await task.done;
        await settle();
      }
    });

    it('counts every conversion ahead, running or waiting', async () => {
      const queue = makeQueue(2);
      const started: string[] = [];

      const tasks = ['A', 'B', 'C'].map((ticket) =>
        startTask(queue, ticket, started, ticket),
      );
      await settle();

      assert.deepEqual(queue.position('A'), { state: 'converting' });
      assert.deepEqual(queue.position('B'), { state: 'converting' });
      assert.deepEqual(queue.position('C'), { state: 'waiting', ahead: 2 });

      for (const task of tasks) {
        task.finish();
      }
      await Promise.all(tasks.map((task) => task.done));
    });

    it('counts requests without a ticket', async () => {
      const queue = makeQueue(1);
      const started: string[] = [];

      const script = startTask(queue, 'script', started);
      const other = startTask(queue, 'other', started);
      const page = startTask(queue, 'page', started, 'P');
      await settle();

      assert.deepEqual(queue.position('P'), { state: 'waiting', ahead: 2 });

      for (const task of [script, other, page]) {
        task.finish();
        await task.done;
        await settle();
      }
    });

    it('stops counting a request as soon as it leaves, ticket or not', async () => {
      const queue = makeQueue(1);
      const started: string[] = [];

      const a = startTask(queue, 'a', started);
      const noTicket = startTask(queue, 'no-ticket', started);
      const withTicket = startTask(queue, 'with-ticket', started, 'W');
      const page = startTask(queue, 'page', started, 'P');
      await settle();

      assert.deepEqual(queue.position('P'), { state: 'waiting', ahead: 3 });

      noTicket.leave();
      withTicket.leave();

      assert.deepEqual(queue.position('W'), { state: 'unknown' });
      assert.deepEqual(queue.position('P'), { state: 'waiting', ahead: 1 });

      a.finish();
      await Promise.all([a.done, noTicket.done, withTicket.done]);
      await settle();

      assert.deepEqual(started, ['a', 'page']);
      assert.deepEqual(queue.position('P'), { state: 'converting' });

      page.finish();
      await page.done;
    });
  });

  describe('tickets', () => {
    it('knows which tickets are in use until the request ends', async () => {
      const queue = makeQueue(1);
      const started: string[] = [];

      const a = startTask(queue, 'a', started, 'A');
      await settle();

      assert.equal(queue.hasTicket('A'), true);

      a.finish();
      await a.done;

      assert.equal(queue.hasTicket('A'), false);
    });

    it('frees the ticket of a request that left', async () => {
      const queue = makeQueue(1);
      const started: string[] = [];

      const a = startTask(queue, 'a', started);
      const b = startTask(queue, 'b', started, 'B');

      b.leave();

      assert.equal(queue.hasTicket('B'), false);

      a.finish();
      await Promise.all([a.done, b.done]);
    });
  });

  describe('settings', () => {
    for (const value of [0, -1, 1.5, Number.NaN]) {
      it(`rejects maxParallel ${value}`, () => {
        assert.throws(() => makeQueue(value), {
          message: `maxParallel must be a whole number of at least 1, got ${value}.`,
        });
      });
    }
  });
});
