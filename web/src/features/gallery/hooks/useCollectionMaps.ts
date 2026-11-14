import { useEffect, useState } from 'react';
import { isAbortError } from '@/shared/http/index.ts';
import { galleryApi, type GalleryApi } from '../api/gallery-api.ts';
import type { MapEntry } from '../model/catalog.ts';

function useCollectionMaps(
  collection: string | null,
  count: number,
  api: GalleryApi = galleryApi,
): MapEntry[] {
  const [maps, setMaps] = useState<MapEntry[]>([]);

  useEffect(() => {
    if (!collection) {
      return;
    }

    const controller = new AbortController();

    async function load(tag: string) {
      try {
        const page = await api.fetchPage(
          { tag, offset: 0, limit: count },
          controller.signal,
        );
        setMaps(page.maps);
      } catch (error) {
        if (!isAbortError(error)) {
          setMaps([]);
        }
      }
    }

    void load(collection);
    return () => controller.abort();
  }, [api, collection, count]);

  return maps;
}

export { useCollectionMaps };
