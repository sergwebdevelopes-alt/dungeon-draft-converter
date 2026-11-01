import http from 'node:http';
import sharp from 'sharp';
import { createApp } from './app.ts';
import {
  IS_PRODUCTION,
  PORT,
  SHARP_CONCURRENCY,
  SHUTDOWN_TIMEOUT_MS,
  STALE_CLEANUP_INTERVAL_MS,
} from './config.ts';
import { removeStaleUploadDirs } from './http/upload.ts';

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

process.once('SIGTERM', () => {
  shuttingDown = true;
  console.log(
    `SIGTERM received: finishing running requests (up to ${SHUTDOWN_TIMEOUT_MS / 1000} s).`,
  );
  server.close(() => console.log('All requests finished.'));
  server.closeIdleConnections();
  setTimeout(() => {
    console.error('Shutdown timed out, stopping running requests.');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();
});
