import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import { cleanUpStaleUploads } from './upload-cleanup-job.ts';

describe('cleanUpStaleUploads', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it('says how many leftover folders it removed, and nothing when there were none', async () => {
    const log = mock.method(console, 'log', () => undefined);

    await cleanUpStaleUploads(undefined, () => Promise.resolve(2));
    await cleanUpStaleUploads(undefined, () => Promise.resolve(0));

    assert.deepEqual(
      log.mock.calls.map((call) => call.arguments),
      [['Removed 2 leftover upload folder(s).']],
    );
  });

  it('logs a failed cleanup, reports it and carries on', async () => {
    const logError = mock.method(console, 'error', () => undefined);
    const failure = new Error('The disk is read-only.');
    const reported: unknown[] = [];

    await cleanUpStaleUploads(
      (error) => reported.push(error),
      () => Promise.reject(failure),
    );

    assert.deepEqual(reported, [failure]);
    assert.deepEqual(logError.mock.calls[0].arguments, [
      'Upload folder cleanup failed:',
      failure,
    ]);
  });

  it('only logs a failed cleanup when nobody asked for reports', async () => {
    mock.method(console, 'error', () => undefined);

    await assert.doesNotReject(
      cleanUpStaleUploads(undefined, () => Promise.reject(new Error('No.'))),
    );
  });
});
