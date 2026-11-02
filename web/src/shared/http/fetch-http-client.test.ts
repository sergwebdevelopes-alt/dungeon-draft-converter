import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFetchHttpClient } from './fetch-http-client.ts';
import { HttpError, isAbortError } from './http-client.ts';

function stubFetch(response: Response | Promise<Response>) {
  const fetchMock = vi.fn(() => Promise.resolve(response));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('createFetchHttpClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads JSON and passes the signal', async () => {
    const fetchMock = stubFetch(Response.json({ ok: 1 }));
    const signal = new AbortController().signal;

    const body = await createFetchHttpClient().getJson('/api/x', { signal });

    expect(body).toEqual({ ok: 1 });
    expect(fetchMock).toHaveBeenCalledWith('/api/x', { signal });
  });

  it('throws an HttpError with the server message', async () => {
    stubFetch(Response.json({ error: 'Nope.' }, { status: 422 }));

    const error = await createFetchHttpClient()
      .getJson('/api/x')
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({ status: 422, message: 'Nope.' });
  });

  it('falls back to the status when the error body is not JSON', async () => {
    stubFetch(new Response('oops', { status: 500 }));

    await expect(createFetchHttpClient().getJson('/api/x')).rejects.toThrow(
      'Request failed (500).',
    );
  });

  it('posts a form, reports the response and returns a Blob', async () => {
    const fetchMock = stubFetch(new Response('zip'));
    const onResponse = vi.fn();
    const form = new FormData();

    const blob = await createFetchHttpClient().postForm('/api/convert', form, {
      onResponse,
    });

    expect(await blob.text()).toBe('zip');
    expect(onResponse).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith('/api/convert', {
      method: 'POST',
      body: form,
      signal: undefined,
    });
  });

  it('does not report a response that failed', async () => {
    stubFetch(Response.json({ error: 'Too big.' }, { status: 400 }));
    const onResponse = vi.fn();

    await expect(
      createFetchHttpClient().postForm('/api/convert', new FormData(), {
        onResponse,
      }),
    ).rejects.toThrow('Too big.');
    expect(onResponse).not.toHaveBeenCalled();
  });

  it('lets an abort through as an abort error', async () => {
    stubFetch(Promise.reject(new DOMException('stop', 'AbortError')));

    const error = await createFetchHttpClient()
      .getJson('/api/x')
      .catch((e: unknown) => e);

    expect(isAbortError(error)).toBe(true);
  });
});
