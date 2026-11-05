import { STALE_CLEANUP_INTERVAL_MS } from '../config.ts';
import { removeStaleUploadDirs } from '../http/upload/index.ts';
import { schedule, type Job } from '../infrastructure/scheduler/schedule.ts';

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

function startUploadCleanupJob(): Job {
  return schedule(cleanUpStaleUploads, {
    everyMs: STALE_CLEANUP_INTERVAL_MS,
    atStart: true,
  });
}

export { startUploadCleanupJob };
