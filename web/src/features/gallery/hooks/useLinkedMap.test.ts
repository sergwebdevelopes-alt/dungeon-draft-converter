import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { GalleryApi } from '../api/gallery-api.ts';
import type { MapEntry } from '../model/catalog.ts';
import { useLinkedMap } from './useLinkedMap.ts';

const CAVE = { slug: 'cave', title: 'Cave' } as MapEntry;
const INN = { slug: 'inn', title: 'Inn' } as MapEntry;

function apiWith(fetchMap: GalleryApi['fetchMap']): GalleryApi {
  return {
    fetchPage: () => Promise.reject(new Error('Not used.')),
    fetchMap,
    fetchHighlights: () => Promise.reject(new Error('Not used.')),
    prefetchFirstPage: () => Promise.resolve(),
  };
}

describe('useLinkedMap', () => {
  it('loads the map by its slug, and has neither a map nor a verdict until it arrives', async () => {
    const asked: string[] = [];
    const api = apiWith((slug) => {
      asked.push(slug);
      return Promise.resolve(CAVE);
    });

    const { result } = renderHook(() => useLinkedMap('cave', null, api));

    expect(result.current).toEqual({ map: null, missing: false });
    await waitFor(() =>
      expect(result.current).toEqual({ map: CAVE, missing: false }),
    );
    expect(asked).toEqual(['cave']);
  });

  it('says the map is missing when the server has none, or cannot be asked', async () => {
    const none = renderHook(() =>
      useLinkedMap(
        'nope',
        null,
        apiWith(() => Promise.resolve(null)),
      ),
    );
    await waitFor(() =>
      expect(none.result.current).toEqual({ map: null, missing: true }),
    );

    const down = renderHook(() =>
      useLinkedMap(
        'cave',
        null,
        apiWith(() => Promise.reject(new Error('down'))),
      ),
    );
    await waitFor(() =>
      expect(down.result.current).toEqual({ map: null, missing: true }),
    );
  });

  it('uses a map that is already loaded without asking the server', () => {
    const asked: string[] = [];
    const api = apiWith((slug) => {
      asked.push(slug);
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useLinkedMap('cave', CAVE, api));

    expect(result.current).toEqual({ map: CAVE, missing: false });
    expect(asked).toEqual([]);
  });

  it('forgets the answer for one map when another is asked for', async () => {
    const api = apiWith((slug) =>
      Promise.resolve(slug === 'cave' ? CAVE : INN),
    );
    const { result, rerender } = renderHook(
      (slug: string) => useLinkedMap(slug, null, api),
      { initialProps: 'cave' },
    );
    await waitFor(() => expect(result.current.map).toBe(CAVE));

    rerender('inn');

    expect(result.current).toEqual({ map: null, missing: false });
    await waitFor(() => expect(result.current.map).toBe(INN));
  });
});
