interface RequestOptions {
  signal?: AbortSignal;
}

interface PostFormOptions extends RequestOptions {
  onResponse?: () => void;
}

interface HttpClient {
  getJson<T>(url: string, options?: RequestOptions): Promise<T>;
  postForm(
    url: string,
    form: FormData,
    options?: PostFormOptions,
  ): Promise<Blob>;
}

class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export { HttpError, isAbortError };
export type { HttpClient, PostFormOptions, RequestOptions };
