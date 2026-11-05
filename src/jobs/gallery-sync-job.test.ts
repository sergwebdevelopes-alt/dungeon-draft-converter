import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import { startGallerySyncJob } from './gallery-sync-job.ts';

describe('startGallerySyncJob', () => {
  beforeEach(() => {
    mock.timers.enable({ apis: ['setInterval'] });
    mock.method(console, 'log', () => undefined);
  });

  afterEach(() => {
    mock.timers.reset();
    mock.restoreAll();
  });

  it('does nothing without a sync', () => {
    const job = startGallerySyncJob(undefined);

    mock.timers.tick(24 * 60 * 60 * 1000);
    job.stop();
  });

  it('runs the given sync every interval, and not at startup in dev', () => {
    let runs = 0;
    const job = startGallerySyncJob({
      run() {
        runs += 1;
        return Promise.resolve();
      },
    });

    assert.equal(runs, 0);
    mock.timers.tick(60 * 60 * 1000);
    assert.equal(runs, 1);

    job.stop();
    mock.timers.tick(60 * 60 * 1000);
    assert.equal(runs, 1);
  });
});
