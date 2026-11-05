import { http, HttpError, type HttpClient } from '../../shared/http/index.ts';
import { abortable } from '../../shared/lib/abortable.ts';
import type {
  MapResponse,
  MapsResponse,
} from '../../../../src/contracts/gallery-api.ts';
import type { MapEntry } from './model/catalog.ts';
import { firstPage, type PageRequest } from './model/map-pages.ts';

interface GalleryApi {
  fetchPage(request: PageRequest, signal: AbortSignal): Promise<MapsResponse>;
  fetchMap(slug: string, signal: AbortSignal): Promise<MapEntry | null>;
  prefetchFirstPage(): Promise<void>;
}

const LATEST = firstPage(null);

function pageUrl({ tag, offset, limit }: PageRequest): string {
  const params = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
  });
  if (tag) {
    params.set('tag', tag);
  }

  return `/api/maps?${params.toString()}`;
}

function isLatest(request: PageRequest): boolean {
  return (
    request.tag === LATEST.tag &&
    request.offset === LATEST.offset &&
    request.limit === LATEST.limit
  );
}

async function loadPage(
  client: HttpClient,
  request: PageRequest,
  signal?: AbortSignal,
): Promise<MapsResponse> {
  const page = await client.getJson<Partial<MapsResponse>>(pageUrl(request), {
    signal,
  });

  if (!Array.isArray(page.maps) || !Array.isArray(page.tags)) {
    throw new Error('The map catalog has no maps list.');
  }

  return { maps: page.maps, total: page.total ?? 0, tags: page.tags };
}

async function loadMap(
  client: HttpClient,
  slug: string,
  signal: AbortSignal,
): Promise<MapEntry | null> {
  try {
    const found = await client.getJson<MapResponse>(
      `/api/maps/${encodeURIComponent(slug)}`,
      { signal },
    );

    return found.map;
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

function createGalleryApi(client: HttpClient): GalleryApi {
  let latest: Promise<MapsResponse> | null = null;

  async function loadLatestOnce(): Promise<MapsResponse> {
    try {
      return await loadPage(client, LATEST);
    } catch (error) {
      latest = null;
      throw error;
    }
  }

  function sharedLatest(): Promise<MapsResponse> {
    latest ??= loadLatestOnce();

    return latest;
  }

  return {
    fetchPage(request, signal) {
      return isLatest(request)
        ? abortable(sharedLatest(), signal)
        : loadPage(client, request, signal);
    },

    fetchMap(slug, signal) {
      return loadMap(client, slug, signal);
    },

    async prefetchFirstPage() {
      try {
        await sharedLatest();
      } catch {
        return;
      }
    },
  };
}

const galleryApi = createGalleryApi(http);

export { createGalleryApi, galleryApi };
export type { GalleryApi };
