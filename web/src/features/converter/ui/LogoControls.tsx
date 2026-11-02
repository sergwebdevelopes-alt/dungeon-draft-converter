import { useId } from 'react';
import { formatBytes } from '../../../shared/lib/format.ts';
import { useObjectUrl } from '../../../shared/lib/useObjectUrl.ts';
import { LOGO_TYPES } from '../model/map-rules.ts';
import { clamp, isDefaultPlacement, type Limit } from '../model/placement.ts';
import type { LogoLimits, LogoPlacement } from '../model/types.ts';
import { PanelSection } from './PanelSection.tsx';

interface LogoControlsProps {
  logo: File | null;
  limits: LogoLimits | null;
  placement: LogoPlacement | null;
  disabled: boolean;
  onSelect: (file: File) => void;
  onClear: () => void;
  onPlacementChange: (placement: LogoPlacement) => void;
  onPlacementReset: () => void;
}

function Slider({
  label,
  value,
  limit,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  limit: Limit;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  const id = useId();

  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted tabular-nums">{value}%</span>
      </label>
      <input
        id={id}
        type="range"
        className="h-8 w-full disabled:opacity-50"
        min={limit.min}
        max={limit.max}
        step={limit.step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(clamp(Number(event.target.value), limit))}
      />
    </div>
  );
}

function AddLogo({
  disabled,
  onSelect,
}: {
  disabled: boolean;
  onSelect: (file: File) => void;
}) {
  return (
    <label
      className={`flex min-h-12 items-center gap-3 rounded-xl px-3 ring-1 ring-line ring-dashed transition hover:ring-gold/60 has-focus-visible:outline-3 has-focus-visible:outline-brand-text ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
      <input
        type="file"
        className="sr-only"
        accept={LOGO_TYPES.join(',')}
        disabled={disabled}
        onChange={(event) => {
          const [file] = event.target.files ?? [];
          if (file) {
            onSelect(file);
          }
          event.target.value = '';
        }}
      />
      <span aria-hidden="true" className="text-xl text-gold">
        +
      </span>
      <span className="grid">
        <span className="text-sm font-bold">Add your logo</span>
        <span className="text-xs text-muted">
          PNG, JPG or WebP · bottom-right
        </span>
      </span>
    </label>
  );
}

function LogoControls({
  logo,
  limits,
  placement,
  disabled,
  onSelect,
  onClear,
  onPlacementChange,
  onPlacementReset,
}: LogoControlsProps) {
  const url = useObjectUrl(logo);
  const canPlace = logo && limits && placement;

  return (
    <PanelSection
      title="Logo"
      action={
        canPlace && (
          <button
            type="button"
            className="min-h-8 text-sm font-bold text-brand-text hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:no-underline"
            disabled={disabled || isDefaultPlacement(placement, limits)}
            onClick={onPlacementReset}
          >
            Reset
          </button>
        )
      }
    >
      {!logo && <AddLogo disabled={disabled} onSelect={onSelect} />}

      {logo && (
        <div className="flex items-center gap-3">
          {url && (
            <img
              src={url}
              alt=""
              className="size-10 shrink-0 rounded-lg bg-sunken object-contain ring-1 ring-line"
            />
          )}
          <span className="grid min-w-0 flex-1">
            <strong className="truncate text-sm">{logo.name}</strong>
            <span className="text-xs text-muted">{formatBytes(logo.size)}</span>
          </span>
          <button
            type="button"
            className="min-h-11 px-2 text-sm font-bold text-muted hover:text-danger disabled:opacity-40"
            disabled={disabled}
            onClick={onClear}
          >
            Remove
          </button>
        </div>
      )}

      {canPlace && (
        <div className="grid grid-cols-2 gap-4">
          <Slider
            label="Size"
            value={placement.size}
            limit={limits.size}
            disabled={disabled}
            onChange={(size) => onPlacementChange({ ...placement, size })}
          />
          <Slider
            label="Margin"
            value={placement.margin}
            limit={limits.margin}
            disabled={disabled}
            onChange={(margin) => onPlacementChange({ ...placement, margin })}
          />
        </div>
      )}
    </PanelSection>
  );
}

export { LogoControls };
