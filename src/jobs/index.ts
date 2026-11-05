import type { GallerySync } from '../gallery/sync.ts';
import { startGallerySyncJob } from './gallery-sync-job.ts';
import type { Job } from './schedule.ts';
import { startUploadCleanupJob } from './upload-cleanup-job.ts';

interface JobDeps {
  gallerySync?: GallerySync;
}

function startJobs({ gallerySync }: JobDeps): Job {
  const jobs = [startUploadCleanupJob(), startGallerySyncJob(gallerySync)];

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
