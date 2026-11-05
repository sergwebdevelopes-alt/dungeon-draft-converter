import { setTimeout as sleep } from 'node:timers/promises';
import type { HttpClient, RequestOptions } from './http-client.ts';

type Wait = (ms: number, signal?: AbortSignal) => Promise<void>;

const waitFor: Wait = async (ms, signal) => {
  await sleep(ms, undefined, { signal });
};

function createRateLimitedHttpClient(
  client: HttpClient,
  minIntervalMs: number,
  { now = Date.now, wait = waitFor } = {},
): HttpClient {
  let nextAt = 0;

  async function waitForTurn(options?: RequestOptions): Promise<void> {
    const startAt = Math.max(now(), nextAt);
    nextAt = startAt + minIntervalMs;

    if (startAt > now()) {
      await wait(startAt - now(), options?.signal);
    }
  }

  return {
    async get<T>(url: string, options?: RequestOptions) {
      await waitForTurn(options);
      return client.get<T>(url, options);
    },

    async getBytes(url, options) {
      await waitForTurn(options);
      return client.getBytes(url, options);
    },

    async post<T>(url: string, body?: unknown, options?: RequestOptions) {
      await waitForTurn(options);
      return client.post<T>(url, body, options);
    },
  };
}

export { createRateLimitedHttpClient };
export type { Wait };
