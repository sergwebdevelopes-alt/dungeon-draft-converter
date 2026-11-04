import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { startGallerySyncJob } from './gallery-sync-job.ts';

describe('startGallerySyncJob', () => {
  it('stays off without a database', () => {
    const log = mock.method(console, 'log', () => undefined);

    try {
      const job = startGallerySyncJob(undefined);
      job.stop();

      assert.match(String(log.mock.calls[0].arguments[0]), /sync is off/);
    } finally {
      log.mock.restore();
    }
  });
});
