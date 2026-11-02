import { useEffect, useState } from 'react';
import { isAbortError } from '../../shared/http/index.ts';
import { galleryApi, type GalleryApi } from './api.ts';
import type { MapEntry } from './model/catalog.ts';

type CatalogState =
  | { status: 'loading' }
  | { status: 'ready'; maps: MapEntry[] }
  | { status: 'error' };

function useMapCatalog(api: GalleryApi = galleryApi): CatalogState {
  const [state, setState] = useState<CatalogState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const maps = await api.fetchMaps(controller.signal);
        setState({ status: 'ready', maps });
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

export { useMapCatalog };
export type { CatalogState };
