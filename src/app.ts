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
  WEB_DIST_DIR,
} from './config.ts';
import { errorHandler, notFound } from './http/errors.ts';
import { serveGalleryImages } from './http/gallery-images.ts';
import type { LogConversion } from './http/convert/conversion-log.ts';
import { configRouter } from './http/routes/config.ts';
import { healthRouter } from './http/routes/health.ts';
import { convertRouter } from './http/routes/convert.ts';
import { queueRouter } from './http/routes/queue.ts';
import { blockCrossSiteRequests, securityHeaders } from './http/security.ts';
import { refuseNewWorkDuringShutdown } from './http/shutdown.ts';
import { serveWebApp } from './http/spa-fallback.ts';
import { ConversionQueue, PendingLimit } from './queue/index.ts';

interface AppOptions {
  isShuttingDown: () => boolean;
  logConversion?: LogConversion;
}

async function createApp(
  server: http.Server,
  { isShuttingDown, logConversion }: AppOptions,
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
