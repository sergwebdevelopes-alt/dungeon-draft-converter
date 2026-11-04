import { describe, expect, it, vi } from 'vitest';
import type { HttpClient, RequestOptions } from '../../shared/http/index.ts';
import { createGalleryApi } from './api.ts';

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
  it('loads the maps from the generated catalog', async () => {
    const maps = [{ slug: 'cave' }];
    const http = fakeHttp({ maps });

    await expect(
      createGalleryApi(http.client).fetchMaps(signal()),
    ).resolves.toEqual(maps);
    expect(http.getJson).toHaveBeenCalledWith('/api/maps', undefined);
  });

  it('loads the catalog once for every page that asks', async () => {
    const http = fakeHttp({ maps: [{ slug: 'cave' }] });
    const api = createGalleryApi(http.client);

    await api.fetchMaps(signal());
    await api.fetchMaps(signal());

    expect(http.getJson).toHaveBeenCalledTimes(1);
  });

  it('keeps loading for other pages when one page leaves', async () => {
    const http = fakeHttp({ maps: [{ slug: 'cave' }] });
    const api = createGalleryApi(http.client);
    const leaving = new AbortController();

    const first = api.fetchMaps(leaving.signal);
    leaving.abort();

    await expect(first).rejects.toThrow('aborted');
    await expect(api.fetchMaps(signal())).resolves.toHaveLength(1);
    expect(http.getJson).toHaveBeenCalledTimes(1);
  });

  it('can start loading early for a page about to open', async () => {
    const http = fakeHttp({ maps: [{ slug: 'cave' }] });
    const api = createGalleryApi(http.client);

    await api.prefetchMaps();

    await expect(api.fetchMaps(signal())).resolves.toHaveLength(1);
    expect(http.getJson).toHaveBeenCalledTimes(1);
  });

  it('stays quiet when an early load fails', async () => {
    const http = fakeHttp(new Error('Offline.'));

    await expect(createGalleryApi(http.client).prefetchMaps()).resolves.toBe(
      undefined,
    );
  });

  it('tries again after a failed load', async () => {
    const http = fakeHttp(new Error('Offline.'), { maps: [] });
    const api = createGalleryApi(http.client);

    await expect(api.fetchMaps(signal())).rejects.toThrow('Offline.');
    await expect(api.fetchMaps(signal())).resolves.toEqual([]);
  });

  it('rejects a catalog without a maps list', async () => {
    const http = fakeHttp({ nope: true });

    await expect(
      createGalleryApi(http.client).fetchMaps(signal()),
    ).rejects.toThrow('The map catalog has no maps list.');
  });
});
