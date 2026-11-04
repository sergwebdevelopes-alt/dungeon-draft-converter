import {
  GALLERY_DIR,
  GALLERY_GENERIC_TAGS,
  GALLERY_IMAGES_URL,
  GALLERY_REQUEST_INTERVAL_MS,
  SETTINGS,
} from '../config.ts';
import { renderGalleryImages } from '../core/gallery-images.ts';
import type { Database } from '../db/database.ts';
import { createFetchHttpClient } from '../http/client/fetch-http-client.ts';
import { createRateLimitedHttpClient } from '../http/client/rate-limited-http-client.ts';
import type { PatreonSettings } from '../settings/read-settings.ts';
import type { ImageStore } from './image-store.ts';
import { createLocalImageStore } from './local-image-store.ts';
import type { MapStore } from './map-store.ts';
import { createOfficialPatreonApi } from './patreon/official-patreon-api.ts';
import { createWebsitePostDetails } from './patreon/website-post-details.ts';
import { createPostgresMapStore } from './postgres-map-store.ts';
import {
  createGallerySync,
  type GallerySync,
  type GallerySyncDeps,
} from './sync.ts';

interface GalleryStores {
  maps: MapStore;
  images: ImageStore;
}

type SyncOptions = Pick<GallerySyncDeps, 'log' | 'signal'>;

function createGalleryStores(database: Database): GalleryStores {
  return {
    maps: createPostgresMapStore(database),
    images: createLocalImageStore({
      dir: GALLERY_DIR,
      baseUrl: GALLERY_IMAGES_URL,
    }),
  };
}

function createGallerySyncFromSettings(
  stores: GalleryStores,
  patreon: PatreonSettings,
  options: SyncOptions = {},
): GallerySync {
  const http = createRateLimitedHttpClient(
    createFetchHttpClient(),
    GALLERY_REQUEST_INTERVAL_MS,
  );

  return createGallerySync({
    patreon: createOfficialPatreonApi(http, {
      token: patreon.creatorToken,
      campaignId: patreon.campaignId,
    }),
    details: createWebsitePostDetails(http, patreon.campaignId),
    http,
    ...stores,
    render: renderGalleryImages,
    rules: { tag: SETTINGS.gallery.tag, genericTags: GALLERY_GENERIC_TAGS },
    ...options,
  });
}

export { createGalleryStores, createGallerySyncFromSettings };
export type { GalleryStores };
