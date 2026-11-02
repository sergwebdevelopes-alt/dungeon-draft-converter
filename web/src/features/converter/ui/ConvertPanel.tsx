import type { ReactNode } from 'react';
import { formatDuration } from '../../../shared/lib/format.ts';
import { progressLabel, type Status } from '../model/progress.ts';

const PRIMARY_BUTTON =
  'inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-gold px-4 font-bold text-on-gold transition-[filter] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100';

const SECONDARY_BUTTON =
  'inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-line px-4 font-bold hover:border-gold';

interface ConvertPanelProps {
  status: Status;
  elapsedMs: number;
  canSubmit: boolean;
  mapCount: number;
  formats: string[];
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
  elapsedMs,
  canSubmit,
  mapCount,
  formats,
  imageCount,
  onCancel,
  onDownloadAgain,
  onReset,
}: ConvertPanelProps) {
  return (
    <aside
      aria-label="Conversion"
      className="fixed inset-x-0 bottom-0 z-20 grid gap-3 border-t border-line bg-surface pt-3 pr-[max(1rem,env(safe-area-inset-right))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] shadow-[0_-8px_24px_rgb(0_0_0/0.25)] lg:sticky lg:inset-auto lg:top-6 lg:gap-3 lg:rounded-xl lg:border lg:p-4 lg:shadow-none"
    >
      <h2 className="hidden font-display text-lg font-bold tracking-wide lg:block">
        Your download
      </h2>

      <dl className="hidden grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 lg:grid">
        <SummaryRow label="Maps">
          {mapCount === 0 ? 'None yet' : mapCount}
        </SummaryRow>
        <SummaryRow label="Formats">
          {formats.length === 0 ? 'None' : formats.join(', ')}
        </SummaryRow>
        <SummaryRow label="Images">{imageCount}</SummaryRow>
      </dl>

      <p className="text-center text-sm text-muted lg:hidden">
        {mapCount === 0
          ? 'Add a map to start'
          : `${plural(mapCount, 'map')} · ${plural(imageCount, 'image')}`}
      </p>

      <PanelStatus status={status} elapsedMs={elapsedMs} />

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

function SummaryRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd className="m-0 text-right tabular-nums">{children}</dd>
    </>
  );
}

function PanelStatus({
  status,
  elapsedMs,
}: {
  status: Status;
  elapsedMs: number;
}) {
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
      <div role="status" className="grid gap-2">
        <div className="h-1.5 overflow-hidden rounded-full bg-sunken">
          <div className="h-full w-2/5 rounded-full bg-gold motion-safe:animate-progress motion-reduce:w-full motion-reduce:opacity-60" />
        </div>
        <div className="flex justify-between gap-3 text-sm">
          <span>{progressLabel(status.progress)}</span>
          <span className="shrink-0 text-muted tabular-nums">
            {formatDuration(elapsedMs)}
          </span>
        </div>
      </div>
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
