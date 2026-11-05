interface RequestOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

interface HttpClient {
  get<T>(url: string, options?: RequestOptions): Promise<T>;
  getBytes(url: string, options?: RequestOptions): Promise<Buffer>;
  post<T>(url: string, body?: unknown, options?: RequestOptions): Promise<T>;
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

export { HttpClientError };
export type { HttpClient, RequestOptions };
