import http from 'node:http';
import sharp from 'sharp';
import { createApp } from './app.ts';
import {
  IS_PRODUCTION,
  PORT,
  SETTINGS,
  SETTINGS_PROBLEMS,
  SHARP_CONCURRENCY,
  SHUTDOWN_TIMEOUT_MS,
} from './config.ts';
import { openDatabase } from './db/open-database.ts';
import { createGalleryStores } from './gallery/setup.ts';
import { startJobs } from './jobs/index.ts';
import { stopOnBadSettings } from './settings/stop-on-bad-settings.ts';

stopOnBadSettings(SETTINGS_PROBLEMS);

const database = SETTINGS.database
  ? await openDatabase(SETTINGS.database)
  : null;
const galleryStores = database ? createGalleryStores(database) : undefined;
const jobs = startJobs({ galleryStores });

if (SHARP_CONCURRENCY > 0) {
  sharp.concurrency(SHARP_CONCURRENCY);
}

let shuttingDown = false;
const server = http.createServer();

server.on(
  'request',
  await createApp(server, {
    isShuttingDown: () => shuttingDown,
    galleryStores,
  }),
);

server.listen(PORT, () => {
  console.log(
    `Listening on http://localhost:${PORT} (${IS_PRODUCTION ? 'production' : 'dev'})`,
  );
});

function stopNow(): void {
  console.log('SIGTERM received: stopping now (dev).');
  server.closeAllConnections();
  process.exit(0);
}

function stopGracefully(): void {
  shuttingDown = true;
  jobs.stop();
  console.log(
    `SIGTERM received: finishing running requests (up to ${SHUTDOWN_TIMEOUT_MS / 1000} s).`,
  );
  server.close(() => {
    console.log('All requests finished.');
    void database?.close();
  });
  server.closeIdleConnections();
  setTimeout(() => {
    console.error('Shutdown timed out, stopping running requests.');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();
}

process.once('SIGTERM', IS_PRODUCTION ? stopGracefully : stopNow);
