import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { GalleryApi } from '../api/gallery-api.ts';
import type { MapEntry } from '../model/catalog.ts';
import { useHighlights } from './useHighlights.ts';

const CAVE = { slug: 'cave', title: 'Cave' } as MapEntry;

function apiWith(fetchHighlights: GalleryApi['fetchHighlights']): GalleryApi {
  return {
    fetchPage: () => Promise.reject(new Error('Not used.')),
    fetchMap: () => Promise.reject(new Error('Not used.')),
    fetchHighlights,
    prefetchFirstPage: () => Promise.resolve(),
  };
}

describe('useHighlights', () => {
  it('has no maps until they arrive', async () => {
    const api = apiWith(() => Promise.resolve([CAVE]));

    const { result } = renderHook(() => useHighlights(api));

    expect(result.current).toEqual([]);
    await waitFor(() => expect(result.current).toEqual([CAVE]));
  });

  it('stays empty when the maps cannot be loaded', async () => {
    let asked = 0;
    const api = apiWith(() => {
      asked += 1;
      return Promise.reject(new Error('down'));
    });

    const { result } = renderHook(() => useHighlights(api));

    await waitFor(() => expect(asked).toBe(1));
    expect(result.current).toEqual([]);
  });

  it('stops the request when the page goes away', () => {
    let stop: AbortSignal | undefined;
    const api = apiWith((signal) => {
      stop = signal;
      return new Promise(() => undefined);
    });

    const { unmount } = renderHook(() => useHighlights(api));
    expect(stop?.aborted).toBe(false);

    unmount();

    expect(stop?.aborted).toBe(true);
  });
});
