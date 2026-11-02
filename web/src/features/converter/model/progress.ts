import type { QueuePosition } from './types.ts';

type Progress =
  | { state: 'uploading' }
  | Exclude<QueuePosition, { state: 'unknown' }>
  | { state: 'downloading' };

type Status =
  | { kind: 'idle' }
  | {
      kind: 'converting';
      startedAt: number;
      ticket: string;
      progress: Progress;
    }
  | { kind: 'done'; url: string; fileName: string }
  | { kind: 'error'; message: string };

function progressLabel(progress: Progress): string {
  switch (progress.state) {
    case 'uploading':
      return 'Uploading…';
    case 'waiting':
      if (progress.ahead === 0) {
        return 'Starting…';
      }
      return `Waiting in line: ${progress.ahead} ${progress.ahead === 1 ? 'map' : 'maps'} ahead of yours`;
    case 'converting':
      return 'Converting…';
    case 'downloading':
      return 'Converting and downloading…';
  }
}

function withProgress(
  status: Status,
  ticket: string,
  progress: Progress,
): Status {
  return status.kind === 'converting' &&
    status.ticket === ticket &&
    status.progress.state !== 'downloading'
    ? { ...status, progress }
    : status;
}

export { progressLabel, withProgress };
export type { Progress, Status };
