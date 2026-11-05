import {
  GALLERY_DIR,
  GALLERY_IMAGES_URL,
  GALLERY_REQUEST_INTERVAL_MS,
  SETTINGS,
} from '../config.ts';
import { renderGalleryImages } from '../core/gallery-images.ts';
import type { Database } from '../infrastructure/database/database.ts';
import { createFetchHttpClient } from '../infrastructure/http-client/fetch-http-client.ts';
import { createRateLimitedHttpClient } from '../infrastructure/http-client/rate-limited-http-client.ts';
import { sanitizeWithLibrary } from '../html/sanitize-html-sanitizer.ts';
import type { PatreonSettings } from '../settings/read-settings.ts';
import type { ImageStore } from './image-store.ts';
import { createLocalImageStore } from './local-image-store.ts';
import type { MapStore } from './map-store.ts';
import { createOfficialPatreonApi } from './patreon/official-patreon-api.ts';
import { createPatreonAuth } from './patreon/patreon-auth.ts';
import { createPostgresTokenStore } from './patreon/postgres-token-store.ts';
import type { TokenStore } from './patreon/token-store.ts';
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
  tokens: TokenStore;
}

interface ManagedGallerySync extends GallerySync {
  stop(): void;
}

type SyncOptions = Pick<GallerySyncDeps, 'log' | 'signal'>;

function createGalleryStores(database: Database): GalleryStores {
  return {
    maps: createPostgresMapStore(database),
    images: createLocalImageStore({
      dir: GALLERY_DIR,
      baseUrl: GALLERY_IMAGES_URL,
    }),
    tokens: createPostgresTokenStore(database),
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

  const auth = createPatreonAuth(http, patreon, stores.tokens);

  return createGallerySync({
    patreon: createOfficialPatreonApi(http, {
      auth,
      campaignId: patreon.campaignId,
      sanitize: sanitizeWithLibrary,
    }),
    details: createWebsitePostDetails(http, patreon.campaignId),
    http,
    maps: stores.maps,
    images: stores.images,
    render: renderGalleryImages,
    ...options,
  });
}

function createGallerySyncIfConfigured(
  stores: GalleryStores | undefined,
): ManagedGallerySync | undefined {
  const { patreon } = SETTINGS;
  if (!stores || !patreon) {
    console.log('No database or Patreon settings: the gallery sync is off.');
    return undefined;
  }

  const stopping = new AbortController();
  const sync = createGallerySyncFromSettings(stores, patreon, {
    signal: stopping.signal,
  });

  return {
    run: () => sync.run(),
    stop: () => stopping.abort(),
  };
}

export {
  createGalleryStores,
  createGallerySyncFromSettings,
  createGallerySyncIfConfigured,
};
export type { GalleryStores, ManagedGallerySync };
