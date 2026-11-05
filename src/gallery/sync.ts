import type { GalleryImages } from '../core/gallery-images.ts';
import {
  isAbortError,
  type HttpClient,
} from '../infrastructure/http-client/http-client.ts';
import { messageOf } from '../shared/utils/error-message.ts';
import { withoutUndefined } from '../shared/utils/object.ts';
import { singleFlight } from '../shared/utils/single-flight.ts';
import type { ImageStore } from './image-store.ts';
import type { MapStore, StoredMap, SyncCounts } from './map-store.ts';
import { createMapImages, type MapImages } from './map-images.ts';
import { withUniqueSlugs } from './model/slug.ts';
import { foldersToRemove, galleryMaps } from './model/sync-plan.ts';
import type { MapRecord } from './model/types.ts';
import type { PatreonApi } from './patreon/patreon-api.ts';
import type { PostDetailsSource } from './patreon/post-details.ts';

interface GallerySyncLogEntry extends Partial<SyncCounts> {
  event: 'gallery-sync';
  result: 'ok' | 'cancelled' | 'failed';
  posts?: number;
  maps?: number;
  failed?: number;
  error?: string;
  tookMs: number;
}

interface GallerySyncDeps {
  patreon: PatreonApi;
  details: PostDetailsSource;
  http: HttpClient;
  maps: MapStore;
  images: ImageStore;
  render: (original: Buffer) => Promise<GalleryImages>;
  log?: (entry: GallerySyncLogEntry) => void;
  signal?: AbortSignal;
  now?: () => number;
}

interface GallerySync {
  run(): Promise<void>;
}

interface SyncResult extends SyncCounts {
  posts: number;
  maps: number;
  failed: number;
}

interface ReadyMaps {
  ready: MapRecord[];
  failed: number;
}

function logToConsole(entry: GallerySyncLogEntry): void {
  console.log(JSON.stringify(entry));
}

async function prepareAll(
  wanted: MapRecord[],
  previous: StoredMap[],
  mapImages: MapImages,
): Promise<ReadyMaps> {
  const previousById = new Map(previous.map((map) => [map.postId, map]));
  const ready: MapRecord[] = [];
  let failed = 0;

  for (const map of wanted) {
    const prepared = await mapImages.prepare(map, previousById.get(map.postId));
    if (prepared.map) {
      ready.push(prepared.map);
    }
    if (prepared.failed) {
      failed += 1;
    }
  }

  return { ready, failed };
}

function createGallerySync({
  patreon,
  details,
  http,
  maps,
  images,
  render,
  log = logToConsole,
  signal,
  now = Date.now,
}: GallerySyncDeps): GallerySync {
  const mapImages = createMapImages({ http, images, render, signal });

  async function syncOnce(): Promise<SyncResult> {
    const posts = await patreon.listPosts(signal);
    const allDetails = await details.listDetails({ signal });
    const previous = await maps.listMaps();

    const wanted = galleryMaps(posts, allDetails);
    const { ready, failed } = await prepareAll(wanted, previous, mapImages);

    const next = withUniqueSlugs(ready);
    const counts = await maps.replaceMaps(next);

    for (const folder of foldersToRemove(previous, next)) {
      await images.removeFolder(folder);
    }

    return {
      posts: posts.length,
      maps: next.length,
      failed,
      ...counts,
    };
  }

  async function syncAndLog(): Promise<void> {
    const startedAt = now();

    try {
      const result = await syncOnce();
      log({
        event: 'gallery-sync',
        result: 'ok',
        ...result,
        tookMs: now() - startedAt,
      });
    } catch (error) {
      log(
        withoutUndefined({
          event: 'gallery-sync',
          result: isAbortError(error) ? 'cancelled' : 'failed',
          error: isAbortError(error) ? undefined : messageOf(error),
          tookMs: now() - startedAt,
        }),
      );
    }
  }

  return { run: singleFlight(syncAndLog, signal) };
}

export { createGallerySync, logToConsole };
export type { GallerySync, GallerySyncDeps, GallerySyncLogEntry };
