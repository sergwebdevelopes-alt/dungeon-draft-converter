import {
  GALLERY_DIR,
  GALLERY_IMAGES_URL,
  GALLERY_REQUEST_INTERVAL_MS,
  SETTINGS,
} from './config.ts';
import { renderMapImagesWithSharp } from './features/gallery/adapters/sharp-map-image-renderer.ts';
import type { Database } from './infrastructure/database/database.ts';
import { createFetchHttpClient } from './infrastructure/http-client/fetch-http-client.ts';
import { createHttpMapImageSource } from './features/gallery/adapters/http-map-image-source.ts';
import { createRateLimitedHttpClient } from './infrastructure/http-client/rate-limited-http-client.ts';
import { sanitizeWithSanitizeHtml } from './features/gallery/adapters/sanitize-html-sanitizer.ts';
import type { PatreonSettings } from './settings/read-settings.ts';
import { createLocalImageStorage } from './features/gallery/adapters/local-image-storage.ts';
import { createPatreonApiPosts } from './features/gallery/adapters/patreon-api-posts.ts';
import { createPatreonTokenRefresher } from './features/gallery/adapters/patreon-token-refresher.ts';
import { createPostgresPatreonTokenRepository } from './features/gallery/adapters/postgres-patreon-token-repository.ts';
import { createPatreonWebsitePostDetails } from './features/gallery/adapters/patreon-website-post-details.ts';
import { createPostgresMapRepository } from './features/gallery/adapters/postgres-map-repository.ts';
import {
  createGallerySync,
  type GallerySync,
  type GallerySyncDeps,
} from './features/gallery/application/sync-gallery.ts';
import type { GalleryStores } from './features/gallery/ports/gallery-stores.ts';

interface ManagedGallerySync extends GallerySync {
  stop(): void;
}

type SyncOptions = Pick<GallerySyncDeps, 'log' | 'signal'>;

function createGalleryStores(database: Database): GalleryStores {
  return {
    maps: createPostgresMapRepository(database),
    images: createLocalImageStorage({
      dir: GALLERY_DIR,
      baseUrl: GALLERY_IMAGES_URL,
    }),
    tokens: createPostgresPatreonTokenRepository(database),
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

  const auth = createPatreonTokenRefresher(http, patreon, stores.tokens);

  return createGallerySync({
    patreon: createPatreonApiPosts(http, {
      auth,
      campaignId: patreon.campaignId,
      sanitize: sanitizeWithSanitizeHtml,
    }),
    details: createPatreonWebsitePostDetails(http, patreon.campaignId, {
      relayKey: patreon.relayKey,
    }),
    fetchImage: createHttpMapImageSource(http),
    maps: stores.maps,
    images: stores.images,
    render: renderMapImagesWithSharp,
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
export type { ManagedGallerySync };
