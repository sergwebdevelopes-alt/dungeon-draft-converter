import { useEffect, useState } from 'react';
import { isAbortError } from '../../shared/http/index.ts';
import { galleryApi, type GalleryApi } from './api.ts';
import type { MapEntry } from './model/catalog.ts';

function useLinkedMap(
  slug: string | null,
  loaded: MapEntry | null,
  api: GalleryApi = galleryApi,
): MapEntry | null {
  const [linked, setLinked] = useState<MapEntry | null>(null);
  const missing = slug !== null && loaded === null;

  useEffect(() => {
    if (!missing) {
      return;
    }

    const controller = new AbortController();

    async function find(wanted: string) {
      try {
        setLinked(await api.fetchMap(wanted, controller.signal));
      } catch (error) {
        if (!isAbortError(error)) {
          setLinked(null);
        }
      }
    }

    void find(slug);
    return () => controller.abort();
  }, [api, slug, missing]);

  if (loaded) {
    return loaded;
  }

  return linked?.slug === slug ? linked : null;
}

export { useLinkedMap };
