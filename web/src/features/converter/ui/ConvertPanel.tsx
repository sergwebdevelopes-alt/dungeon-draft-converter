import { formatDuration } from '../../../shared/lib/format.ts';
import { useElapsed } from '../../../shared/lib/useElapsed.ts';
import {
  progressLabel,
  type Progress,
  type Status,
} from '../model/progress.ts';

const PRIMARY_BUTTON =
  'inline-flex min-h-12 w-full items-center justify-center rounded-full bg-gold px-5 font-bold text-on-gold shadow-[0_10px_30px_-10px_var(--gold)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none disabled:hover:brightness-100';

const SECONDARY_BUTTON =
  'inline-flex min-h-12 w-full items-center justify-center rounded-full px-5 font-bold ring-1 ring-line hover:ring-gold';

interface ConvertPanelProps {
  status: Status;
  canSubmit: boolean;
  mapCount: number;
  imageCount: number;
  onCancel: () => void;
  onDownloadAgain: () => void;
  onReset: () => void;
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function ConvertPanel({
  status,
  canSubmit,
  mapCount,
  imageCount,
  onCancel,
  onDownloadAgain,
  onReset,
}: ConvertPanelProps) {
  return (
    <aside
      aria-label="Conversion"
      className="fixed inset-x-0 bottom-0 z-20 grid gap-3 border-t border-line bg-surface/95 pt-3 pr-[max(1rem,env(safe-area-inset-right))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] shadow-[0_-8px_24px_rgb(0_0_0/0.25)] backdrop-blur-xl lg:static lg:border-t lg:border-line lg:bg-transparent lg:px-0 lg:pt-5 lg:pb-0 lg:shadow-none lg:backdrop-blur-none"
    >
      {mapCount > 0 && (
        <p className="text-center text-sm text-muted lg:text-left">
          {plural(mapCount, 'map')} · {plural(imageCount, 'image')}
        </p>
      )}

      <PanelStatus status={status} />

      <PanelActions
        status={status}
        canSubmit={canSubmit}
        onCancel={onCancel}
        onDownloadAgain={onDownloadAgain}
        onReset={onReset}
      />
    </aside>
  );
}

function ConvertingStatus({
  startedAt,
  progress,
}: {
  startedAt: number;
  progress: Progress;
}) {
  const elapsedMs = useElapsed(startedAt);

  return (
    <div role="status" className="grid gap-2">
      <div className="h-1.5 overflow-hidden rounded-full bg-sunken">
        <div className="h-full w-2/5 rounded-full bg-gold motion-safe:animate-progress motion-reduce:w-full motion-reduce:opacity-60" />
      </div>
      <div className="flex justify-between gap-3 text-sm">
        <span>{progressLabel(progress)}</span>
        <span className="shrink-0 text-muted tabular-nums">
          {formatDuration(elapsedMs)}
        </span>
      </div>
    </div>
  );
}

function PanelStatus({ status }: { status: Status }) {
  if (status.kind === 'error') {
    return (
      <p
        role="alert"
        className="rounded-lg border-l-[3px] border-danger bg-danger-soft px-3 py-2 text-sm"
      >
        {status.message}
      </p>
    );
  }

  if (status.kind === 'converting') {
    return (
      <ConvertingStatus
        startedAt={status.startedAt}
        progress={status.progress}
      />
    );
  }

  if (status.kind === 'done') {
    return (
      <p
        role="status"
        className="rounded-lg border-l-[3px] border-success bg-success-soft px-3 py-2 text-sm"
      >
        <strong className="break-all">{status.fileName}</strong> is ready.
      </p>
    );
  }

  return null;
}

function PanelActions({
  status,
  canSubmit,
  onCancel,
  onDownloadAgain,
  onReset,
}: {
  status: Status;
  canSubmit: boolean;
  onCancel: () => void;
  onDownloadAgain: () => void;
  onReset: () => void;
}) {
  if (status.kind === 'done') {
    return (
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
        <button
          type="button"
          className={PRIMARY_BUTTON}
          onClick={onDownloadAgain}
        >
          Download again
        </button>
        <button type="button" className={SECONDARY_BUTTON} onClick={onReset}>
          Convert another map
        </button>
      </div>
    );
  }

  if (status.kind === 'converting') {
    return (
      <button type="button" className={SECONDARY_BUTTON} onClick={onCancel}>
        Cancel
      </button>
    );
  }

  return (
    <button type="submit" className={PRIMARY_BUTTON} disabled={!canSubmit}>
      Convert &amp; download
    </button>
  );
}

export { ConvertPanel };
