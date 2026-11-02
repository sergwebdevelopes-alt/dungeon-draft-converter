import { useState, type CSSProperties, type DragEvent } from 'react';
import { useObjectUrl } from '../../../shared/lib/useObjectUrl.ts';
import { GridOverlay } from '../../../shared/ui/GridOverlay.tsx';
import type { GridChoice } from '../model/grid-choice.ts';
import type { LogoPlacement } from '../model/types.ts';
import type { PreviewState } from '../useMapPreview.ts';
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
        <div className="absolute inset-0 bg-black/10" />
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

function useStageDrop(disabled: boolean, onFiles: (files: File[]) => void) {
  const [over, setOver] = useState(false);

  return {
    over,
    handlers: {
      onDragOver(event: DragEvent) {
        event.preventDefault();
        setOver(!disabled);
      },
      onDragLeave(event: DragEvent) {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOver(false);
        }
      },
      onDrop(event: DragEvent) {
        event.preventDefault();
        setOver(false);
        const files = [...event.dataTransfer.files];
        if (!disabled && files.length > 0) {
          onFiles(files);
        }
      },
    },
  };
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
  const drop = useStageDrop(disabled, onAddMaps);

  if (preview.status === 'empty') {
    return (
      <DropZone
        file={null}
        disabled={disabled}
        onFiles={onAddMaps}
        accept=".dd2vtt"
        title="Drop your .dd2vtt files here"
        hint="One map, or up to 10 levels to merge · or click to browse"
        multiple
        className="size-full rounded-2xl"
      />
    );
  }

  return (
    <div
      {...drop.handlers}
      className={`relative grid size-full place-items-center rounded-2xl bg-sunken p-3 transition-shadow sm:p-5 ${drop.over ? 'ring-2 ring-gold' : ''}`}
      style={{ containerType: 'size' }}
    >
      {preview.status === 'loading' && (
        <StageMessage>Reading map…</StageMessage>
      )}
      {preview.status === 'error' && (
        <StageMessage>{`${preview.message} It can still be converted.`}</StageMessage>
      )}
      {preview.status === 'ready' && (
        <div
          className="relative overflow-hidden rounded-lg shadow-2xl"
          style={frameStyle(preview.columns, preview.rows)}
        >
          <img
            src={preview.url}
            alt="Preview of the main map"
            draggable={false}
            className="size-full object-cover"
          />
          <GridLayer
            columns={preview.columns}
            rows={preview.rows}
            grid={grid}
          />
          {logo && placement && <LogoMark logo={logo} placement={placement} />}
          {busy && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 animate-sweep bg-[linear-gradient(105deg,transparent_35%,rgb(241_214_119/0.28)_50%,transparent_65%)] bg-size-[250%_100%]"
            />
          )}
        </div>
      )}
    </div>
  );
}

export { MapStage };
