import { describe, expect, it } from 'vitest';
import { progressLabel, withProgress, type Status } from './progress.ts';

function converting(
  progress: Extract<Status, { kind: 'converting' }>['progress'],
): Status {
  return { kind: 'converting', startedAt: 0, ticket: 'a', progress };
}

describe('progressLabel', () => {
  it('describes each step', () => {
    expect(progressLabel({ state: 'uploading' })).toBe('Uploading…');
    expect(progressLabel({ state: 'converting' })).toBe('Converting…');
    expect(progressLabel({ state: 'downloading' })).toBe(
      'Converting and downloading…',
    );
  });

  it('shows the place in line', () => {
    expect(progressLabel({ state: 'waiting', ahead: 0 })).toBe('Starting…');
    expect(progressLabel({ state: 'waiting', ahead: 1 })).toBe(
      'Waiting in line: 1 map ahead of yours',
    );
    expect(progressLabel({ state: 'waiting', ahead: 3 })).toBe(
      'Waiting in line: 3 maps ahead of yours',
    );
  });
});

describe('withProgress', () => {
  it('updates the progress of the same ticket', () => {
    const next = withProgress(converting({ state: 'uploading' }), 'a', {
      state: 'converting',
    });

    expect(next).toEqual(converting({ state: 'converting' }));
  });

  it('ignores another ticket', () => {
    const status = converting({ state: 'uploading' });

    expect(withProgress(status, 'b', { state: 'converting' })).toBe(status);
  });

  it('never goes back from downloading', () => {
    const status = converting({ state: 'downloading' });

    expect(withProgress(status, 'a', { state: 'waiting', ahead: 2 })).toBe(
      status,
    );
  });

  it('leaves other statuses alone', () => {
    const status: Status = { kind: 'idle' };

    expect(withProgress(status, 'a', { state: 'converting' })).toBe(status);
  });
});
