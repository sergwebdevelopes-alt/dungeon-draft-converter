import type { GallerySync } from '../features/gallery/application/sync-gallery.ts';
import { startGallerySyncJob } from '../features/gallery/jobs/gallery-sync-job.ts';
import type { Job } from '../infrastructure/scheduler/schedule.ts';
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
