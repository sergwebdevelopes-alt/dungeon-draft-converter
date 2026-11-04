import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { singleFlight } from './single-flight.ts';

function counter() {
  let runs = 0;
  const work = async () => {
    runs += 1;
    await Promise.resolve();
  };

  return { work, runs: () => runs };
}

describe('singleFlight', () => {
  it('runs once more when asked during a run, however often it is asked', async () => {
    const { work, runs } = counter();
    const run = singleFlight(work);

    const first = run();
    const second = run();
    const third = run();
    await Promise.all([first, second, third]);

    assert.equal(second, first);
    assert.equal(third, first);
    assert.equal(runs(), 2);
  });

  it('starts a new run once the last one has finished', async () => {
    const { work, runs } = counter();
    const run = singleFlight(work);

    await run();
    await run();

    assert.equal(runs(), 2);
  });

  it('does not run again after it was stopped', async () => {
    const { work, runs } = counter();
    const stop = new AbortController();
    const run = singleFlight(work, stop.signal);

    const first = run();
    void run();
    stop.abort();
    await first;

    assert.equal(runs(), 1);
  });

  it('can run again after a run that failed', async () => {
    let calls = 0;
    const run = singleFlight(async () => {
      calls += 1;
      await Promise.resolve();
      if (calls === 1) {
        throw new Error('Broken.');
      }
    });

    await assert.rejects(run(), /Broken/);
    await run();

    assert.equal(calls, 2);
  });
});
