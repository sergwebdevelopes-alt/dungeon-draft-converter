import { describe, expect, it, vi } from 'vitest';
import type { HttpClient, RequestOptions } from '../../shared/http/index.ts';
import { createConverterApi } from './api.ts';

function fakeHttp() {
  const getJson = vi.fn<
    (url: string, options?: RequestOptions) => Promise<unknown>
  >(() => Promise.resolve({}));
  const postForm = vi.fn<HttpClient['postForm']>(() =>
    Promise.resolve(new Blob(['zip'])),
  );
  const client: HttpClient = {
    getJson: <T>(url: string, options?: RequestOptions) =>
      getJson(url, options) as Promise<T>,
    postForm,
  };

  return { client, getJson, postForm };
}

const signal = new AbortController().signal;

describe('createConverterApi', () => {
  it('loads the config and the queue position', async () => {
    const http = fakeHttp();
    const api = createConverterApi(http.client);

    await api.fetchConfig(signal);
    await api.fetchQueuePosition('abc', signal);

    expect(http.getJson).toHaveBeenNthCalledWith(1, '/api/config', { signal });
    expect(http.getJson).toHaveBeenNthCalledWith(2, '/api/queue/abc', {
      signal,
    });
  });

  it('sends maps, logo and options', async () => {
    const http = fakeHttp();
    const onDownloading = vi.fn();
    const maps = [
      new File(['a'], 'Tower.dd2vtt'),
      new File(['b'], 'Cellar.dd2vtt'),
    ];
    const logo = new File(['l'], 'logo.png', { type: 'image/png' });

    await createConverterApi(http.client).convert(
      {
        ticket: 't1',
        maps,
        presets: ['JPG_70', 'WEBP_140'],
        variants: ['NoGrid'],
        logo: { image: logo, placement: { size: 12, margin: 2.5 } },
      },
      signal,
      onDownloading,
    );

    const [url, form, options] = http.postForm.mock.calls[0] as unknown as [
      string,
      FormData,
      { signal: AbortSignal; onResponse: () => void },
    ];
    const params = new URL(url, 'http://test').searchParams;
    expect(Object.fromEntries(params)).toEqual({
      ticket: 't1',
      name: 'Tower.dd2vtt',
      presets: 'JPG_70,WEBP_140',
      variants: 'NoGrid',
      logoSize: '12',
      logoMargin: '2.5',
    });
    expect(form.getAll('maps').map((f) => (f as File).name)).toEqual([
      'Tower.dd2vtt',
      'Cellar.dd2vtt',
    ]);
    expect((form.get('logo') as File).name).toBe('logo.png');
    expect(options.signal).toBe(signal);
    expect(options.onResponse).toBe(onDownloading);
  });

  it('leaves logo options out without a logo', async () => {
    const http = fakeHttp();

    await createConverterApi(http.client).convert(
      {
        ticket: 't',
        maps: [new File(['a'], 'A.dd2vtt')],
        presets: ['JPG_70'],
        variants: ['Grid'],
      },
      signal,
      () => undefined,
    );

    const [url, form] = http.postForm.mock.calls[0] as unknown as [
      string,
      FormData,
    ];
    expect(url).not.toContain('logo');
    expect(form.has('logo')).toBe(false);
  });
});
