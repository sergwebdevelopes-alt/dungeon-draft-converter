import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { GalleryApi } from '../api/gallery-api.ts';
import type { MapEntry } from '../model/catalog.ts';
import type { PageRequest } from '../model/map-pages.ts';
import { useCollectionMaps } from './useCollectionMaps.ts';

const CAVE = { slug: 'cave', title: 'Cave' } as MapEntry;

function apiWith(fetchPage: GalleryApi['fetchPage']): GalleryApi {
  return {
    fetchPage,
    fetchMap: () => Promise.reject(new Error('Not used.')),
    fetchHighlights: () => Promise.reject(new Error('Not used.')),
    prefetchFirstPage: () => Promise.resolve(),
  };
}

describe('useCollectionMaps', () => {
  it('asks for just the wanted number of maps of the collection', async () => {
    const asked: PageRequest[] = [];
    const api = apiWith((request) => {
      asked.push(request);
      return Promise.resolve({
        maps: [CAVE],
        total: 9,
        tags: [],
        collections: [],
      });
    });

    const { result } = renderHook(() => useCollectionMaps('Caves', 5, api));

    expect(result.current).toEqual([]);
    await waitFor(() => expect(result.current).toEqual([CAVE]));
    expect(asked).toEqual([{ tag: 'Caves', offset: 0, limit: 5 }]);
  });

  it('asks for nothing without a collection', () => {
    let asked = 0;
    const api = apiWith(() => {
      asked += 1;
      return Promise.reject(new Error('Not used.'));
    });

    const { result } = renderHook(() => useCollectionMaps(null, 5, api));

    expect(result.current).toEqual([]);
    expect(asked).toBe(0);
  });

  it('stays empty when the maps cannot be loaded', async () => {
    let asked = 0;
    const api = apiWith(() => {
      asked += 1;
      return Promise.reject(new Error('down'));
    });

    const { result } = renderHook(() => useCollectionMaps('Caves', 5, api));

    await waitFor(() => expect(asked).toBe(1));
    expect(result.current).toEqual([]);
  });
});
