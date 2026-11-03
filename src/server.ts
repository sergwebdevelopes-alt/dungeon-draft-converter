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
  STALE_CLEANUP_INTERVAL_MS,
} from './config.ts';
import type { Database, DatabaseConnection } from './db/database.ts';
import { openDatabase } from './db/open-database.ts';
import { removeStaleUploadDirs } from './http/upload/index.ts';
import { stopOnBadSettings } from './settings/stop-on-bad-settings.ts';

async function startDatabase(
  connection: DatabaseConnection | undefined,
): Promise<Database | null> {
  if (!connection) {
    console.log(
      'No POSTGRES_USER and POSTGRES_PASSWORD: gallery features are off.',
    );
    return null;
  }

  return openDatabase(connection);
}

stopOnBadSettings(SETTINGS_PROBLEMS);
const database = await startDatabase(SETTINGS.database);

if (SHARP_CONCURRENCY > 0) {
  sharp.concurrency(SHARP_CONCURRENCY);
}

async function cleanUpStaleUploads(): Promise<void> {
  try {
    const removed = await removeStaleUploadDirs();
    if (removed > 0) {
      console.log(`Removed ${removed} leftover upload folder(s).`);
    }
  } catch (error) {
    console.error('Upload folder cleanup failed:', error);
  }
}

void cleanUpStaleUploads();
setInterval(
  () => void cleanUpStaleUploads(),
  STALE_CLEANUP_INTERVAL_MS,
).unref();

let shuttingDown = false;
const server = http.createServer();

server.on(
  'request',
  await createApp(server, { isShuttingDown: () => shuttingDown }),
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
