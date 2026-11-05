import type http from 'node:http';
import path from 'node:path';
import express from 'express';
import {
  GALLERY_DIR,
  GALLERY_IMAGES_URL,
  IS_PRODUCTION,
  MAX_PARALLEL_CONVERSIONS,
  MAX_PENDING_CONVERSIONS,
  ROOT_DIR,
  SETTINGS,
  WEB_DIST_DIR,
} from './config.ts';
import {
  errorHandler,
  notFound,
} from './infrastructure/http-server/http-errors.ts';
import { serveGalleryImages } from './features/gallery/http/serve-map-images.ts';
import type { LogConversion } from './http/convert/conversion-log.ts';
import { configRouter } from './http/routes/config.ts';
import { healthRouter } from './infrastructure/http-server/health-route.ts';
import type { GalleryStores } from './features/gallery/ports/gallery-stores.ts';
import type { GallerySync } from './features/gallery/application/sync-gallery.ts';
import * as gallery from './features/gallery/http/routes.ts';
import { convertRouter } from './http/routes/convert.ts';
import { queueRouter } from './http/routes/queue.ts';
import {
  blockCrossSiteRequests,
  securityHeaders,
} from './infrastructure/http-server/security.ts';
import { refuseNewWorkDuringShutdown } from './infrastructure/http-server/refuse-work-during-shutdown.ts';
import { serveWebApp } from './infrastructure/http-server/serve-web-app.ts';
import { ConversionQueue, PendingLimit } from './queue/index.ts';

interface AppOptions {
  isShuttingDown: () => boolean;
  logConversion?: LogConversion;
  galleryStores?: GalleryStores;
  gallerySync?: GallerySync;
}

async function createApp(
  server: http.Server,
  { isShuttingDown, logConversion, galleryStores, gallerySync }: AppOptions,
): Promise<express.Express> {
  const queue = new ConversionQueue({ maxParallel: MAX_PARALLEL_CONVERSIONS });
  const pendingLimit = new PendingLimit(MAX_PENDING_CONVERSIONS);

  const app = express();
  app.disable('x-powered-by');
  app.use(
    securityHeaders,
    blockCrossSiteRequests,
    refuseNewWorkDuringShutdown(isShuttingDown),
  );

  app.use(
    '/api',
    healthRouter(isShuttingDown),
    configRouter(),
    queueRouter(queue),
    gallery.createRoutes({
      stores: galleryStores,
      sync: gallerySync,
      webhookSecret: SETTINGS.patreon?.webhookSecret,
    }),
    convertRouter(queue, pendingLimit, logConversion),
    notFound,
  );

  app.use(GALLERY_IMAGES_URL, serveGalleryImages(GALLERY_DIR));

  if (IS_PRODUCTION) {
    app.use(serveWebApp(WEB_DIST_DIR));
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      configFile: path.join(ROOT_DIR, 'vite.config.ts'),
      server: { middlewareMode: true, hmr: { server } },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.use(errorHandler);
  return app;
}

export { createApp };
