import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { HttpClient, RequestOptions } from './http-client.ts';
import {
  createRateLimitedHttpClient,
  type Wait,
} from './rate-limited-http-client.ts';

function fakeClock() {
  let time = 1_000;
  const waits: number[] = [];
  const signals: (AbortSignal | undefined)[] = [];
  const wait: Wait = (ms, signal) => {
    waits.push(ms);
    signals.push(signal);
    time += ms;
    return Promise.resolve();
  };

  return {
    now: () => time,
    wait,
    waits,
    signals,
    pass: (ms: number) => (time += ms),
  };
}

function fakeClient() {
  const calls: { url: string; options?: RequestOptions }[] = [];
  const client: HttpClient = {
    get<T>(url: string, options?: RequestOptions) {
      calls.push({ url, options });
      return Promise.resolve({ url } as T);
    },
    getBytes(url, options) {
      calls.push({ url, options });
      return Promise.resolve(Buffer.from(url));
    },
    post<T>(url: string, body?: unknown, options?: RequestOptions) {
      calls.push({ url, options });
      return Promise.resolve({ url, body } as T);
    },
  };

  return { client, calls };
}

describe('createRateLimitedHttpClient', () => {
  it('sends the first request at once and spaces the next ones', async () => {
    const clock = fakeClock();
    const { client, calls } = fakeClient();
    const limited = createRateLimitedHttpClient(client, 1_000, clock);

    await limited.get('/a');
    await limited.getBytes('/b');
    clock.pass(400);
    await limited.get('/c');

    assert.deepEqual(clock.waits, [1_000, 600]);
    assert.deepEqual(
      calls.map((call) => call.url),
      ['/a', '/b', '/c'],
    );
  });

  it('spaces posts too and passes the body through', async () => {
    const clock = fakeClock();
    const { client } = fakeClient();
    const limited = createRateLimitedHttpClient(client, 1_000, clock);

    await limited.get('/a');
    const answer = await limited.post('/token', { a: 1 });

    assert.deepEqual(clock.waits, [1_000]);
    assert.deepEqual(answer, { url: '/token', body: { a: 1 } });
  });

  it('does not wait when the interval has already passed', async () => {
    const clock = fakeClock();
    const { client } = fakeClient();
    const limited = createRateLimitedHttpClient(client, 1_000, clock);

    await limited.get('/a');
    clock.pass(5_000);
    await limited.get('/b');

    assert.deepEqual(clock.waits, []);
  });

  it('passes the answer, the options and the signal through', async () => {
    const clock = fakeClock();
    const { client, calls } = fakeClient();
    const limited = createRateLimitedHttpClient(client, 1_000, clock);
    const signal = new AbortController().signal;
    const options = { headers: { Accept: 'x' }, signal };

    await limited.get('/a');
    assert.deepEqual(await limited.get('/b', options), { url: '/b' });

    assert.equal(calls[1].options, options);
    assert.deepEqual(clock.signals, [signal]);
  });

  it('stops waiting when the request is cancelled', async () => {
    const { client, calls } = fakeClient();
    const limited = createRateLimitedHttpClient(client, 60_000);
    const stop = new AbortController();

    await limited.get('/a');
    const waiting = limited.get('/b', { signal: stop.signal });
    stop.abort();

    await assert.rejects(waiting, { name: 'AbortError' });
    assert.equal(calls.length, 1);
  });
});
