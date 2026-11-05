import { useEffect, useState } from 'react';
import { isAbortError } from '../../shared/http/index.ts';
import { galleryApi, type GalleryApi } from './api.ts';
import type { MapEntry } from './model/catalog.ts';
import { firstPage } from './model/map-pages.ts';

type LatestMaps =
  | { status: 'loading' }
  | { status: 'ready'; maps: MapEntry[]; total: number }
  | { status: 'error' };

function useLatestMaps(api: GalleryApi = galleryApi): LatestMaps {
  const [state, setState] = useState<LatestMaps>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const { maps, total } = await api.fetchPage(
          firstPage(null),
          controller.signal,
        );
        setState({ status: 'ready', maps, total });
      } catch (error) {
        if (!isAbortError(error)) {
          setState({ status: 'error' });
        }
      }
    }

    void load();
    return () => controller.abort();
  }, [api]);

  return state;
}

export { useLatestMaps };
export type { LatestMaps };
