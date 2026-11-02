import {
  HttpError,
  type HttpClient,
  type RequestOptions,
} from './http-client.ts';

async function readErrorBody(res: Response): Promise<{ error?: unknown }> {
  try {
    return (await res.json()) as { error?: unknown };
  } catch {
    return {};
  }
}

async function toHttpError(res: Response): Promise<HttpError> {
  const body = await readErrorBody(res);
  const message =
    typeof body.error === 'string'
      ? body.error
      : `Request failed (${res.status}).`;

  return new HttpError(res.status, message);
}

function createFetchHttpClient(): HttpClient {
  return {
    async getJson<T>(url: string, { signal }: RequestOptions = {}) {
      const res = await fetch(url, { signal });
      if (!res.ok) {
        throw await toHttpError(res);
      }

      return (await res.json()) as T;
    },

    async postForm(url, form, { signal, onResponse } = {}) {
      const res = await fetch(url, { method: 'POST', body: form, signal });
      if (!res.ok) {
        throw await toHttpError(res);
      }

      onResponse?.();
      return res.blob();
    },
  };
}

export { createFetchHttpClient };
