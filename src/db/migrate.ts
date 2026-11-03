import { SETTINGS, SETTINGS_PROBLEMS } from '../config.ts';
import { stopOnBadSettings } from '../settings/stop-on-bad-settings.ts';
import { openDatabase } from './open-database.ts';

stopOnBadSettings(SETTINGS_PROBLEMS);

if (!SETTINGS.database) {
  console.error('Set POSTGRES_USER and POSTGRES_PASSWORD to run migrations.');
  process.exit(1);
}

const db = await openDatabase(SETTINGS.database);
await db.close();
