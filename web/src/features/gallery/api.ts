import { http, type HttpClient } from '../../shared/http/index.ts';
import { abortable } from '../../shared/lib/abortable.ts';
import type { MapEntry } from './model/catalog.ts';

const CATALOG_URL = '/maps/catalog.json';

interface GalleryApi {
  fetchMaps(signal: AbortSignal): Promise<MapEntry[]>;
  prefetchMaps(): Promise<void>;
}

async function loadMaps(client: HttpClient): Promise<MapEntry[]> {
  const catalog = await client.getJson<{ maps?: MapEntry[] }>(CATALOG_URL);

  if (!Array.isArray(catalog.maps)) {
    throw new Error('The map catalog has no maps list.');
  }

  return catalog.maps;
}

function createGalleryApi(client: HttpClient): GalleryApi {
  let maps: Promise<MapEntry[]> | null = null;

  async function loadOnce(): Promise<MapEntry[]> {
    try {
      return await loadMaps(client);
    } catch (error) {
      maps = null;
      throw error;
    }
  }

  function shared(): Promise<MapEntry[]> {
    maps ??= loadOnce();

    return maps;
  }

  return {
    fetchMaps(signal) {
      return abortable(shared(), signal);
    },

    async prefetchMaps() {
      try {
        await shared();
      } catch {
        return;
      }
    },
  };
}

const galleryApi = createGalleryApi(http);

export { createGalleryApi, galleryApi };
export type { GalleryApi };
