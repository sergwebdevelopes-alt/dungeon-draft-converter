import { SETTINGS, SETTINGS_PROBLEMS } from '../config.ts';
import { openDatabase } from '../db/open-database.ts';
import { stopOnBadSettings } from '../settings/stop-on-bad-settings.ts';
import { createGalleryStores, createGallerySyncFromSettings } from './setup.ts';
import { logToConsole, type GallerySyncLogEntry } from './sync.ts';

function logAndKeepResult(entry: GallerySyncLogEntry): void {
  logToConsole(entry);
  if (entry.result !== 'ok') {
    process.exitCode = 1;
  }
}

stopOnBadSettings(SETTINGS_PROBLEMS);

const { database: connection, patreon } = SETTINGS;
if (!connection || !patreon) {
  console.error(
    'Set the POSTGRES_* and PATREON_* settings to sync the gallery.',
  );
  process.exit(1);
}

const database = await openDatabase(connection);
try {
  const sync = createGallerySyncFromSettings(
    createGalleryStores(database),
    patreon,
    { log: logAndKeepResult },
  );
  await sync.run();
} finally {
  await database.close();
}
