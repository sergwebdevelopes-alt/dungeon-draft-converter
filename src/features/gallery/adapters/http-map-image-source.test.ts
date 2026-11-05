import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type {
  HttpClient,
  RequestOptions,
} from '../../../infrastructure/http-client/http-client.ts';
import { createHttpMapImageSource } from './http-map-image-source.ts';

describe('createHttpMapImageSource', () => {
  it('downloads the image bytes with the given signal', async () => {
    const requests: { url: string; options?: RequestOptions }[] = [];
    const http: HttpClient = {
      get: () => Promise.reject(new Error('Not used.')),
      post: () => Promise.reject(new Error('Not used.')),
      getBytes(url, options) {
        requests.push({ url, options });
        return Promise.resolve(Buffer.from('image'));
      },
    };
    const { signal } = new AbortController();

    const bytes = await createHttpMapImageSource(http)(
      'https://cdn.test/m1',
      signal,
    );

    assert.equal(bytes.toString(), 'image');
    assert.deepEqual(requests, [
      { url: 'https://cdn.test/m1', options: { signal } },
    ]);
  });
});
