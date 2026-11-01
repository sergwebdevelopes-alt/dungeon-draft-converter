import type http from 'node:http';
import path from 'node:path';
import express from 'express';
import {
  IS_PRODUCTION,
  MAX_PENDING_CONVERSIONS,
  ROOT_DIR,
  WEB_DIST_DIR,
} from './config.ts';
import { errorHandler, notFound } from './http/errors.ts';
import { configRouter } from './http/routes/config.ts';
import { convertRouter } from './http/routes/convert.ts';
import { queueRouter } from './http/routes/queue.ts';
import { blockCrossSiteRequests, securityHeaders } from './http/security.ts';
import { refuseNewWorkDuringShutdown } from './http/shutdown.ts';
import { ConversionQueue } from './queue/conversion-queue.ts';

interface AppOptions {
  isShuttingDown: () => boolean;
}

async function createApp(
  server: http.Server,
  { isShuttingDown }: AppOptions,
): Promise<express.Express> {
  const queue = new ConversionQueue(MAX_PENDING_CONVERSIONS);

  const app = express();
  app.disable('x-powered-by');
  app.use(
    securityHeaders,
    blockCrossSiteRequests,
    refuseNewWorkDuringShutdown(isShuttingDown),
  );

  app.use(
    '/api',
    configRouter(),
    queueRouter(queue),
    convertRouter(queue),
    notFound,
  );

  if (IS_PRODUCTION) {
    app.use(express.static(WEB_DIST_DIR));
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
