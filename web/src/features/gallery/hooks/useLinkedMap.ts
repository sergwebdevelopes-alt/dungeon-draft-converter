import { useEffect, useState } from 'react';
import { isAbortError } from '@/shared/http/index.ts';
import { galleryApi, type GalleryApi } from '../api/gallery-api.ts';
import type { MapEntry } from '../model/catalog.ts';

interface LinkedMap {
  map: MapEntry | null;
  missing: boolean;
}

interface Answer {
  slug: string;
  map: MapEntry | null;
}

function useLinkedMap(
  slug: string | null,
  loaded: MapEntry | null,
  api: GalleryApi = galleryApi,
): LinkedMap {
  const [answer, setAnswer] = useState<Answer | null>(null);
  const missing = slug !== null && loaded === null;

  useEffect(() => {
    if (!missing) {
      return;
    }

    const controller = new AbortController();

    async function find(wanted: string) {
      try {
        setAnswer({
          slug: wanted,
          map: await api.fetchMap(wanted, controller.signal),
        });
      } catch (error) {
        if (!isAbortError(error)) {
          setAnswer({ slug: wanted, map: null });
        }
      }
    }

    void find(slug);
    return () => controller.abort();
  }, [api, slug, missing]);

  if (loaded) {
    return { map: loaded, missing: false };
  }

  const answered = answer?.slug === slug ? answer : null;

  return { map: answered?.map ?? null, missing: answered?.map === null };
}

export { useLinkedMap };
export type { LinkedMap };
