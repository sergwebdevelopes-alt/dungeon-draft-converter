import { HTTP_CLIENT_TIMEOUT_MS } from '../../config.ts';
import {
  HttpClientError,
  type HttpClient,
  type RequestOptions,
} from './http-client.ts';

function retryAfterMs(header: string | null): number | undefined {
  const seconds = Number(header);

  return header !== null && Number.isFinite(seconds) && seconds >= 0
    ? seconds * 1000
    : undefined;
}

function toError(res: Response, url: string): HttpClientError {
  const { origin, pathname } = new URL(url);

  return new HttpClientError(
    res.status,
    `GET ${origin}${pathname} answered ${res.status}.`,
    retryAfterMs(res.headers.get('Retry-After')),
  );
}

function withTimeout(
  signal: AbortSignal | undefined,
  timeoutMs: number,
): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);

  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

function createFetchHttpClient(timeoutMs = HTTP_CLIENT_TIMEOUT_MS): HttpClient {
  return {
    async get<T>(url: string, { headers, signal }: RequestOptions = {}) {
      const res = await fetch(url, {
        headers,
        signal: withTimeout(signal, timeoutMs),
      });
      if (!res.ok) {
        throw toError(res, url);
      }

      return (await res.json()) as T;
    },
  };
}

export { createFetchHttpClient };
