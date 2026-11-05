import { IS_PRODUCTION, SETTINGS } from '../config.ts';
import type { GallerySync } from '../gallery/sync.ts';
import { schedule, type Job } from './schedule.ts';

const NO_JOB: Job = { stop: () => undefined };

function startGallerySyncJob(gallerySync: GallerySync | undefined): Job {
  if (!gallerySync) {
    return NO_JOB;
  }

  const { syncIntervalMinutes } = SETTINGS.gallery;
  const job = schedule(() => gallerySync.run(), {
    everyMs: syncIntervalMinutes * 60 * 1000,
    atStart: IS_PRODUCTION,
  });

  if (!IS_PRODUCTION) {
    console.log(
      `Gallery sync: first run in ${syncIntervalMinutes} min (no sync at startup in dev).`,
    );
  }

  return job;
}

export { startGallerySyncJob };
