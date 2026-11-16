import { STALE_CLEANUP_INTERVAL_MS } from '../../../config.ts';
import { removeStaleUploadDirs } from '../http/upload/upload-dir.ts';
import {
  schedule,
  type Job,
} from '../../../infrastructure/scheduler/schedule.ts';

type ReportFailure = (error: unknown) => void;

async function cleanUpStaleUploads(
  reportFailure?: ReportFailure,
  removeStale: () => Promise<number> = removeStaleUploadDirs,
): Promise<void> {
  try {
    const removed = await removeStale();
    if (removed > 0) {
      console.log(`Removed ${removed} leftover upload folder(s).`);
    }
  } catch (error) {
    console.error('Upload folder cleanup failed:', error);
    reportFailure?.(error);
  }
}

function startUploadCleanupJob(reportFailure?: ReportFailure): Job {
  return schedule(() => cleanUpStaleUploads(reportFailure), {
    everyMs: STALE_CLEANUP_INTERVAL_MS,
    atStart: true,
  });
}

export { cleanUpStaleUploads, startUploadCleanupJob };
