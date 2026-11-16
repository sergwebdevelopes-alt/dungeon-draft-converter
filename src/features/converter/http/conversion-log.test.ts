import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Request, Response } from 'express';
import { UnprocessableError } from '../../../shared/errors.ts';
import {
  addToConversionLog,
  logConversions,
  noteConversionError,
  toLogEntry,
  type ConversionLogEntry,
} from './conversion-log.ts';

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

describe('toLogEntry errors', () => {
  it('says what went wrong, with the detail when there is one', () => {
    const entry = toLogEntry(
      {
        receivedAt: 1_000,
        error: 'LevelMismatchError',
        detail: 'image 200×100 px, main 200×200 px',
      },
      422,
      true,
      1_010,
    );

    assert.deepEqual(entry, {
      event: 'conversion',
      result: 'invalid',
      status: 422,
      error: 'LevelMismatchError',
      detail: 'image 200×100 px, main 200×200 px',
      tookMs: 10,
    });
  });
});

describe('noteConversionError', () => {
  function failedRequest(error: unknown): {
    entry: ConversionLogEntry;
    passedOn: unknown[];
  } {
    const logged: ConversionLogEntry[] = [];
    const closing: (() => void)[] = [];
    const res = {
      statusCode: 422,
      writableFinished: true,
      once: (_event: string, listener: () => void) => closing.push(listener),
    } as unknown as Response;
    const passedOn: unknown[] = [];

    void logConversions((entry) => logged.push(entry))(
      {} as Request,
      res,
      () => undefined,
    );
    noteConversionError(error, {} as Request, res, (passed?: unknown) =>
      passedOn.push(passed),
    );
    for (const close of closing) {
      close();
    }

    return { entry: logged[0], passedOn };
  }

  it('adds the kind of the error and its detail to the log line, and passes the error on', () => {
    class LevelMismatchError extends UnprocessableError {
      name = 'LevelMismatchError';
    }
    const error = new LevelMismatchError(
      '"Lower.dd2vtt" does not match "Main.dd2vtt".',
      'image 200×100 px, main 200×200 px',
    );

    const { entry, passedOn } = failedRequest(error);

    assert.equal(entry.error, 'LevelMismatchError');
    assert.equal(entry.detail, 'image 200×100 px, main 200×200 px');
    assert.equal(JSON.stringify(entry).includes('Lower.dd2vtt'), false);
    assert.deepEqual(passedOn, [error]);
  });

  it('leaves the detail out for an error without one', () => {
    const { entry } = failedRequest(new TypeError('Something broke.'));

    assert.equal(entry.error, 'TypeError');
    assert.equal('detail' in entry, false);
  });

  it('still names something that is not an error', () => {
    const { entry } = failedRequest('boom');

    assert.equal(entry.error, 'Error');
  });

  it('does nothing for a response it is not logging', () => {
    assert.doesNotThrow(() =>
      addToConversionLog({} as Response, { error: 'X' }),
    );
  });
});
