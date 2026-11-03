interface RequestOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

interface HttpClient {
  get<T>(url: string, options?: RequestOptions): Promise<T>;
}

class HttpClientError extends Error {
  name = 'HttpClientError';
  readonly status: number;
  readonly retryAfterMs: number | undefined;

  constructor(status: number, message: string, retryAfterMs?: number) {
    super(message);
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

const ABORT_ERRORS = new Set(['AbortError', 'TimeoutError']);

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && ABORT_ERRORS.has(error.name);
}

export { HttpClientError, isAbortError };
export type { HttpClient, RequestOptions };
