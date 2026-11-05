import type { RenderMapImages } from '../ports/map-image-renderer.ts';
import type { FetchMapImage } from '../ports/map-image-source.ts';
import { messageOf } from '../../../shared/utils/error-message.ts';
import { withoutUndefined } from '../../../shared/utils/object.ts';
import { singleFlight } from '../../../shared/utils/single-flight.ts';
import type { ImageStorage } from '../ports/image-storage.ts';
import type {
  MapRepository,
  StoredMap,
  SyncCounts,
} from '../ports/map-repository.ts';
import {
  createMapImagePreparer,
  type MapImagePreparer,
} from './prepare-map-images.ts';
import { withUniqueSlugs } from '../domain/map-slugs.ts';
import { foldersToRemove, galleryMaps } from '../domain/gallery-sync-plan.ts';
import type { MapRecord } from '../domain/map-record.ts';
import type { PatreonPosts } from '../ports/patreon-posts.ts';
import type { PatreonPostDetails } from '../ports/patreon-post-details.ts';

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
  patreon: PatreonPosts;
  details: PatreonPostDetails;
  fetchImage: FetchMapImage;
  maps: MapRepository;
  images: ImageStorage;
  render: RenderMapImages;
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
  preparer: MapImagePreparer,
): Promise<ReadyMaps> {
  const previousById = new Map(previous.map((map) => [map.postId, map]));
  const ready: MapRecord[] = [];
  let failed = 0;

  for (const map of wanted) {
    const prepared = await preparer.prepare(map, previousById.get(map.postId));
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
  fetchImage,
  maps,
  images,
  render,
  log = logToConsole,
  signal,
  now = Date.now,
}: GallerySyncDeps): GallerySync {
  const preparer = createMapImagePreparer({
    fetchImage,
    images,
    render,
    signal,
  });

  async function syncOnce(): Promise<SyncResult> {
    const posts = await patreon.listPosts(signal);
    const allDetails = await details.listDetails({ signal });
    const previous = await maps.listMaps();

    const wanted = galleryMaps(posts, allDetails);
    const { ready, failed } = await prepareAll(wanted, previous, preparer);

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
      const cancelled = signal?.aborted === true;

      log(
        withoutUndefined({
          event: 'gallery-sync',
          result: cancelled ? 'cancelled' : 'failed',
          error: cancelled ? undefined : messageOf(error),
          tookMs: now() - startedAt,
        }),
      );
    }
  }

  return { run: singleFlight(syncAndLog, signal) };
}

export { createGallerySync, logToConsole };
export type { GallerySync, GallerySyncDeps, GallerySyncLogEntry };
