import type { GallerySync } from './features/gallery/application/sync-gallery.ts';
import {
  NO_ERROR_REPORTER,
  type ErrorReporter,
} from './infrastructure/error-reporting/error-reporter.ts';
import { startGallerySyncJob } from './features/gallery/jobs/gallery-sync-job.ts';
import type { Job } from './infrastructure/scheduler/schedule.ts';
import { startUploadCleanupJob } from './features/converter/jobs/upload-cleanup-job.ts';

interface JobDeps {
  gallerySync?: GallerySync;
  errorReporter?: ErrorReporter;
}

function startJobs({
  gallerySync,
  errorReporter = NO_ERROR_REPORTER,
}: JobDeps): Job {
  const jobs = [
    startUploadCleanupJob((error) =>
      errorReporter.report(error, { where: 'upload-cleanup' }),
    ),
    startGallerySyncJob(gallerySync),
  ];

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
