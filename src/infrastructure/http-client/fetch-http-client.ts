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

interface Send {
  method: 'GET' | 'POST';
  body?: unknown;
}

function toError(res: Response, url: string, method: string): HttpClientError {
  const { origin, pathname } = new URL(url);

  return new HttpClientError(
    res.status,
    `${method} ${origin}${pathname} answered ${res.status}.`,
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

const STOPPED = ['AbortError', 'TimeoutError'];

function failureReason(error: unknown): string {
  const cause = error instanceof Error ? error.cause : undefined;
  if (cause instanceof Error) {
    return 'code' in cause && typeof cause.code === 'string'
      ? cause.code
      : cause.message;
  }

  return error instanceof Error ? error.message : String(error);
}

function toNetworkError(error: unknown, url: string, method: string): unknown {
  if (error instanceof Error && STOPPED.includes(error.name)) {
    return error;
  }
  const { origin, pathname } = new URL(url);

  return new Error(
    `${method} ${origin}${pathname} failed: ${failureReason(error)}.`,
    { cause: error },
  );
}

async function send(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (error) {
    throw toNetworkError(error, url, init.method ?? 'GET');
  }
}

function createFetchHttpClient(timeoutMs = HTTP_CLIENT_TIMEOUT_MS): HttpClient {
  async function request(
    url: string,
    { headers, signal }: RequestOptions = {},
    { method, body }: Send = { method: 'GET' },
  ): Promise<Response> {
    const hasBody = body !== undefined;
    const res = await send(url, {
      method,
      headers: hasBody
        ? { ...headers, 'Content-Type': 'application/json' }
        : headers,
      body: hasBody ? JSON.stringify(body) : undefined,
      signal: withTimeout(signal, timeoutMs),
    });
    if (!res.ok) {
      throw toError(res, url, method);
    }

    return res;
  }

  return {
    async get<T>(url: string, options?: RequestOptions) {
      const res = await request(url, options);

      return (await res.json()) as T;
    },

    async getBytes(url, options) {
      const res = await request(url, options);

      return Buffer.from(await res.arrayBuffer());
    },

    async post<T>(url: string, body?: unknown, options?: RequestOptions) {
      const res = await request(url, options, { method: 'POST', body });

      return (await res.json()) as T;
    },
  };
}

export { createFetchHttpClient };
