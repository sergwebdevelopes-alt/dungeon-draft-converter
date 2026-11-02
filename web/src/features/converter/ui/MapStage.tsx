import { useState, type CSSProperties } from 'react';
import { useFileDrop } from '../../../shared/lib/useFileDrop.ts';
import { useObjectUrl } from '../../../shared/lib/useObjectUrl.ts';
import { GridOverlay } from '../../../shared/ui/GridOverlay.tsx';
import type { GridChoice } from '../model/grid-choice.ts';
import type { LogoPlacement } from '../model/types.ts';
import type { PreviewState } from '../model/map-preview.ts';
import { DropZone } from './DropZone.tsx';

interface MapStageProps {
  preview: PreviewState;
  grid: GridChoice | null;
  logo: File | null;
  placement: LogoPlacement | null;
  busy: boolean;
  disabled: boolean;
  onAddMaps: (files: File[]) => void;
}

const LABEL =
  'pointer-events-none absolute top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-bold tracking-wide text-white uppercase';

function frameStyle(columns: number, rows: number): CSSProperties {
  return {
    aspectRatio: `${columns} / ${rows}`,
    width: `min(100cqw, calc(100cqh * ${columns / rows}))`,
    containerType: 'size',
  };
}

function logoStyle({ size, margin }: LogoPlacement): CSSProperties {
  const shorter = 'min(100cqw, 100cqh)';

  return {
    width: `calc(${shorter} * ${size / 100})`,
    height: `calc(${shorter} * ${size / 100})`,
    right: `calc(${shorter} * ${margin / 100})`,
    bottom: `calc(${shorter} * ${margin / 100})`,
  };
}

function LogoMark({
  logo,
  placement,
}: {
  logo: File;
  placement: LogoPlacement;
}) {
  const url = useObjectUrl(logo);
  if (!url) {
    return null;
  }

  return (
    <img
      src={url}
      alt=""
      data-testid="logo-preview"
      className="pointer-events-none absolute object-contain object-right-bottom drop-shadow-[0_2px_6px_rgb(0_0_0/0.5)]"
      style={logoStyle(placement)}
    />
  );
}

function GridLayer({
  columns,
  rows,
  grid,
}: {
  columns: number;
  rows: number;
  grid: GridChoice | null;
}) {
  const [split, setSplit] = useState(50);
  if (grid !== 'with' && grid !== 'both') {
    return null;
  }

  const compare = grid === 'both';

  return (
    <>
      <div
        data-testid="grid-layer"
        className="pointer-events-none absolute inset-0"
        style={compare ? { clipPath: `inset(0 0 0 ${split}%)` } : undefined}
      >
        <GridOverlay columns={columns} rows={rows} />
      </div>
      {compare && (
        <>
          <span className={`${LABEL} left-3`}>No grid</span>
          <span className={`${LABEL} right-3`}>Grid</span>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-gold shadow-[0_0_14px_var(--gold)]"
            style={{ left: `${split}%` }}
          >
            <span className="absolute top-1/2 left-1/2 grid size-8 -translate-1/2 place-items-center rounded-full bg-gold text-sm font-bold text-on-gold shadow-lg">
              ⇔
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={split}
            aria-label="Compare without and with the grid"
            onChange={(event) => setSplit(Number(event.target.value))}
            className="absolute inset-0 size-full cursor-ew-resize opacity-0"
          />
        </>
      )}
    </>
  );
}

function MapFrame({
  preview,
  grid,
  logo,
  placement,
  busy,
}: {
  preview: Extract<PreviewState, { status: 'ready' }>;
  grid: GridChoice | null;
  logo: File | null;
  placement: LogoPlacement | null;
  busy: boolean;
}) {
  const [main] = preview.layers.slice(-1);

  return (
    <div
      className="relative overflow-hidden rounded-xl ring-1 ring-line"
      style={frameStyle(preview.columns, preview.rows)}
    >
      {preview.layers.map((url) => (
        <img
          key={url}
          src={url}
          alt={url === main ? 'Preview of the main map' : ''}
          draggable={false}
          className="absolute inset-0 size-full object-cover"
        />
      ))}
      <GridLayer columns={preview.columns} rows={preview.rows} grid={grid} />
      {logo && placement && <LogoMark logo={logo} placement={placement} />}
      {busy && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 animate-sweep bg-[linear-gradient(105deg,transparent_35%,rgb(241_214_119/0.28)_50%,transparent_65%)] bg-size-[250%_100%]"
        />
      )}
    </div>
  );
}

function StageMessage({ children }: { children: string }) {
  return (
    <div className="grid size-full place-items-center rounded-2xl bg-sunken p-6 text-center text-muted">
      {children}
    </div>
  );
}

function MapStage({
  preview,
  grid,
  logo,
  placement,
  busy,
  disabled,
  onAddMaps,
}: MapStageProps) {
  const drop = useFileDrop(disabled, onAddMaps);

  if (preview.status === 'empty') {
    return (
      <DropZone
        disabled={disabled}
        onFiles={onAddMaps}
        accept=".dd2vtt"
        title="Drop your .dd2vtt files here"
        hint="One map, or up to 10 levels to merge · or click to browse"
        className="size-full rounded-2xl"
      />
    );
  }

  return (
    <div
      {...drop.handlers}
      className={`relative grid size-full place-items-center rounded-2xl transition-shadow ${drop.over ? 'ring-2 ring-gold ring-offset-4 ring-offset-bg' : ''}`}
      style={{ containerType: 'size' }}
    >
      {preview.status === 'loading' && (
        <StageMessage>Reading map…</StageMessage>
      )}
      {preview.status === 'error' && (
        <StageMessage>{`${preview.message} It can still be converted.`}</StageMessage>
      )}
      {preview.status === 'ready' && (
        <MapFrame
          preview={preview}
          grid={grid}
          logo={logo}
          placement={placement}
          busy={busy}
        />
      )}
    </div>
  );
}

export { MapStage };
