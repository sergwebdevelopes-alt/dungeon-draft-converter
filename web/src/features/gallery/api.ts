import { http, type HttpClient } from '../../shared/http/index.ts';
import type { MapEntry } from './model/catalog.ts';

const CATALOG_URL = '/maps/catalog.json';

interface GalleryApi {
  fetchMaps(signal: AbortSignal): Promise<MapEntry[]>;
}

function createGalleryApi(client: HttpClient): GalleryApi {
  return {
    async fetchMaps(signal) {
      const catalog = await client.getJson<{ maps?: MapEntry[] }>(CATALOG_URL, {
        signal,
      });

      if (!Array.isArray(catalog.maps)) {
        throw new Error('The map catalog has no maps list.');
      }

      return catalog.maps;
    },
  };
}

const galleryApi = createGalleryApi(http);

export { createGalleryApi, galleryApi };
export type { GalleryApi };
