import { useEffect, useState } from 'react';
import { isAbortError } from '@/shared/http/index.ts';
import { galleryApi, type GalleryApi } from '../api/gallery-api.ts';
import type { MapEntry } from '../model/catalog.ts';

function useHighlights(api: GalleryApi = galleryApi): MapEntry[] {
  const [maps, setMaps] = useState<MapEntry[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        setMaps(await api.fetchHighlights(controller.signal));
      } catch (error) {
        if (!isAbortError(error)) {
          setMaps([]);
        }
      }
    }

    void load();
    return () => controller.abort();
  }, [api]);

  return maps;
}

export { useHighlights };
