import { describe, expect, it, vi } from 'vitest';
import type { HttpClient, RequestOptions } from '../../shared/http/index.ts';
import { createGalleryApi } from './api.ts';

function fakeHttp(body: unknown) {
  const getJson = vi.fn<
    (url: string, options?: RequestOptions) => Promise<unknown>
  >(() => Promise.resolve(body));
  const client: HttpClient = {
    getJson: <T>(url: string, options?: RequestOptions) =>
      getJson(url, options) as Promise<T>,
    postForm: vi.fn(),
  };

  return { client, getJson };
}

describe('createGalleryApi', () => {
  it('loads the maps from the generated catalog', async () => {
    const maps = [{ slug: 'cave' }];
    const http = fakeHttp({ maps });
    const signal = new AbortController().signal;

    await expect(
      createGalleryApi(http.client).fetchMaps(signal),
    ).resolves.toEqual(maps);
    expect(http.getJson).toHaveBeenCalledWith('/maps/catalog.json', { signal });
  });

  it('rejects a catalog without a maps list', async () => {
    const http = fakeHttp({ nope: true });

    await expect(
      createGalleryApi(http.client).fetchMaps(new AbortController().signal),
    ).rejects.toThrow('The map catalog has no maps list.');
  });
});
