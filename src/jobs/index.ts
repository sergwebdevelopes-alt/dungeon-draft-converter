import type { GalleryStores } from '../gallery/setup.ts';
import { startGallerySyncJob } from './gallery-sync-job.ts';
import type { Job } from './schedule.ts';
import { startUploadCleanupJob } from './upload-cleanup-job.ts';

interface JobDeps {
  galleryStores?: GalleryStores;
}

function startJobs({ galleryStores }: JobDeps): Job {
  const jobs = [startUploadCleanupJob(), startGallerySyncJob(galleryStores)];

  return {
    stop() {
      for (const job of jobs) {
        job.stop();
      }
    },
  };
}

export { startJobs };
export type { Job };
