import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { toLogEntry } from './conversion-log.ts';

const MB = 1024 * 1024;

describe('toLogEntry', () => {
  it('describes a finished conversion with its timings', () => {
    const entry = toLogEntry(
      {
        receivedAt: 1_000,
        uploadedAt: 1_400,
        startedAt: 2_400,
        levels: 2,
        uploadBytes: 31.26 * MB,
        presets: ['JPG_70'],
        variants: ['NoGrid', 'Grid'],
      },
      200,
      true,
      9_400,
    );

    assert.deepEqual(entry, {
      event: 'conversion',
      result: 'ok',
      status: 200,
      levels: 2,
      uploadMB: 31.3,
      presets: ['JPG_70'],
      variants: ['NoGrid', 'Grid'],
      uploadMs: 400,
      queuedMs: 1_000,
      convertMs: 7_000,
      tookMs: 8_400,
    });
  });

  it('leaves out what a refused request never reached', () => {
    assert.deepEqual(toLogEntry({ receivedAt: 1_000 }, 503, true, 1_005), {
      event: 'conversion',
      result: 'busy',
      status: 503,
      tookMs: 5,
    });
  });

  it('names each way a conversion can end', () => {
    const cases: [number, boolean, boolean, string][] = [
      [400, true, false, 'invalid'],
      [413, true, false, 'invalid'],
      [422, true, false, 'invalid'],
      [500, true, false, 'error'],
      [200, false, false, 'cancelled'],
      [503, true, true, 'timeout'],
      [200, false, true, 'timeout'],
    ];

    for (const [status, finished, timedOut, result] of cases) {
      const entry = toLogEntry(
        { receivedAt: 0, timedOut },
        status,
        finished,
        1,
      );

      assert.equal(entry.result, result, `${status} ${finished} ${timedOut}`);
    }
  });
});
