import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import { schedule } from './schedule.ts';

describe('schedule', () => {
  beforeEach(() => {
    mock.timers.enable({ apis: ['setInterval'] });
  });

  afterEach(() => {
    mock.timers.reset();
  });

  it('runs at the start and then at every interval', () => {
    let runs = 0;
    const job = schedule(
      () => {
        runs += 1;
        return Promise.resolve();
      },
      { everyMs: 1_000, atStart: true },
    );

    assert.equal(runs, 1);
    mock.timers.tick(2_500);
    assert.equal(runs, 3);
    job.stop();
  });

  it('waits for the first interval when it should not run at the start', () => {
    let runs = 0;
    const job = schedule(
      () => {
        runs += 1;
        return Promise.resolve();
      },
      { everyMs: 1_000, atStart: false },
    );

    assert.equal(runs, 0);
    mock.timers.tick(1_000);
    assert.equal(runs, 1);
    job.stop();
  });

  it('stops running once stopped', () => {
    let runs = 0;
    const job = schedule(
      () => {
        runs += 1;
        return Promise.resolve();
      },
      { everyMs: 1_000, atStart: false },
    );

    job.stop();
    mock.timers.tick(5_000);

    assert.equal(runs, 0);
  });
});
