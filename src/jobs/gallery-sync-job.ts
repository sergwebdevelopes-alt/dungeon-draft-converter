import { IS_PRODUCTION, SETTINGS } from '../config.ts';
import {
  createGallerySyncFromSettings,
  type GalleryStores,
} from '../gallery/setup.ts';
import { schedule, type Job } from './schedule.ts';

const NO_JOB: Job = { stop: () => undefined };

function startGallerySyncJob(galleryStores: GalleryStores | undefined): Job {
  const { patreon } = SETTINGS;
  if (!galleryStores || !patreon) {
    console.log('No database or Patreon settings: the gallery sync is off.');
    return NO_JOB;
  }

  const stopping = new AbortController();
  const sync = createGallerySyncFromSettings(galleryStores, patreon, {
    signal: stopping.signal,
  });
  const { syncIntervalMinutes } = SETTINGS.gallery;
  const job = schedule(() => sync.run(), {
    everyMs: syncIntervalMinutes * 60 * 1000,
    atStart: IS_PRODUCTION,
  });

  if (!IS_PRODUCTION) {
    console.log(
      `Gallery sync: first run in ${syncIntervalMinutes} min (no sync at startup in dev).`,
    );
  }

  return {
    stop() {
      job.stop();
      stopping.abort();
    },
  };
}

export { startGallerySyncJob };
