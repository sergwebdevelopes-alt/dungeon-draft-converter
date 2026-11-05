import { describe, expect, it, vi } from 'vitest';
import {
  HttpError,
  type HttpClient,
  type RequestOptions,
} from '../../shared/http/index.ts';
import { createGalleryApi } from './api.ts';
import { firstPage } from './model/map-pages.ts';

const PAGE = { maps: [{ slug: 'cave' }], total: 30, tags: ['Waterdeep'] };

function fakeHttp(...bodies: Array<unknown>) {
  const getJson =
    vi.fn<(url: string, options?: RequestOptions) => Promise<unknown>>();
  for (const body of bodies) {
    getJson.mockImplementationOnce(() =>
      body instanceof Error ? Promise.reject(body) : Promise.resolve(body),
    );
  }
  const client: HttpClient = {
    getJson: <T>(url: string, options?: RequestOptions) =>
      getJson(url, options) as Promise<T>,
    postForm: vi.fn(),
  };

  return { client, getJson };
}

function signal(): AbortSignal {
  return new AbortController().signal;
}

describe('createGalleryApi', () => {
  it('asks for one page of one collection', async () => {
    const http = fakeHttp(PAGE);
    const stop = signal();

    await expect(
      createGalleryApi(http.client).fetchPage(
        { tag: 'Waterdeep & Co', offset: 21, limit: 24 },
        stop,
      ),
    ).resolves.toEqual(PAGE);
    expect(http.getJson).toHaveBeenCalledWith(
      '/api/maps?offset=21&limit=24&tag=Waterdeep+%26+Co',
      { signal: stop },
    );
  });

  it('loads the first page once for every page of the site that asks', async () => {
    const http = fakeHttp(PAGE);
    const api = createGalleryApi(http.client);

    await api.fetchPage(firstPage(null), signal());
    await api.fetchPage(firstPage(null), signal());

    expect(http.getJson).toHaveBeenCalledTimes(1);
    expect(http.getJson).toHaveBeenCalledWith('/api/maps?offset=0&limit=21', {
      signal: undefined,
    });
  });

  it('loads the first page of a collection every time', async () => {
    const http = fakeHttp(PAGE, PAGE);
    const api = createGalleryApi(http.client);

    await api.fetchPage(firstPage('Waterdeep'), signal());
    await api.fetchPage(firstPage('Waterdeep'), signal());

    expect(http.getJson).toHaveBeenCalledTimes(2);
  });

  it('keeps loading the first page for others when one page leaves', async () => {
    const http = fakeHttp(PAGE);
    const api = createGalleryApi(http.client);
    const leaving = new AbortController();

    const first = api.fetchPage(firstPage(null), leaving.signal);
    leaving.abort();

    await expect(first).rejects.toThrow('aborted');
    await expect(api.fetchPage(firstPage(null), signal())).resolves.toEqual(
      PAGE,
    );
    expect(http.getJson).toHaveBeenCalledTimes(1);
  });

  it('can start loading the first page early', async () => {
    const http = fakeHttp(PAGE);
    const api = createGalleryApi(http.client);

    await api.prefetchFirstPage();

    await expect(api.fetchPage(firstPage(null), signal())).resolves.toEqual(
      PAGE,
    );
    expect(http.getJson).toHaveBeenCalledTimes(1);
  });

  it('stays quiet when an early load fails', async () => {
    const http = fakeHttp(new Error('Offline.'));

    await expect(
      createGalleryApi(http.client).prefetchFirstPage(),
    ).resolves.toBe(undefined);
  });

  it('tries again after a failed first page', async () => {
    const http = fakeHttp(new Error('Offline.'), PAGE);
    const api = createGalleryApi(http.client);

    await expect(api.fetchPage(firstPage(null), signal())).rejects.toThrow(
      'Offline.',
    );
    await expect(api.fetchPage(firstPage(null), signal())).resolves.toEqual(
      PAGE,
    );
  });

  it('rejects a page without a maps list', async () => {
    const http = fakeHttp({ total: 1 });

    await expect(
      createGalleryApi(http.client).fetchPage(firstPage(null), signal()),
    ).rejects.toThrow('The map catalog has no maps list.');
  });

  it('finds one map by its slug', async () => {
    const http = fakeHttp({ map: { slug: 'old cave' } });
    const stop = signal();

    await expect(
      createGalleryApi(http.client).fetchMap('old cave', stop),
    ).resolves.toEqual({ slug: 'old cave' });
    expect(http.getJson).toHaveBeenCalledWith('/api/maps/old%20cave', {
      signal: stop,
    });
  });

  it('gives no map for an unknown slug and passes other errors on', async () => {
    const http = fakeHttp(
      new HttpError(404, 'There is no map at this address.'),
      new HttpError(500, 'Down.'),
    );
    const api = createGalleryApi(http.client);

    await expect(api.fetchMap('nope', signal())).resolves.toBeNull();
    await expect(api.fetchMap('nope', signal())).rejects.toThrow('Down.');
  });
});
