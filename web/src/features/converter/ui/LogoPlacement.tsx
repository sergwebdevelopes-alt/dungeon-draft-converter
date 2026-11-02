import { useId } from 'react';
import { useObjectUrl } from '../../../shared/lib/useObjectUrl.ts';
import { clamp, type Limit } from '../model/placement.ts';
import type { LogoLimits, LogoPlacement } from '../model/types.ts';

const PREVIEW_HEIGHT = 80;

interface LogoPlacementPanelProps {
  logo: File;
  limits: LogoLimits;
  value: LogoPlacement;
  disabled: boolean;
  onChange: (value: LogoPlacement) => void;
}

function LogoPlacementPanel({
  logo,
  limits,
  value,
  disabled,
  onChange,
}: LogoPlacementPanelProps) {
  const logoUrl = useObjectUrl(logo);
  const box = (PREVIEW_HEIGHT * value.size) / 100;
  const offset = (PREVIEW_HEIGHT * value.margin) / 100;

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4">
      <div
        aria-hidden="true"
        className="relative h-20 w-[120px] overflow-hidden rounded-md border border-line bg-sunken bg-[linear-gradient(var(--line)_1px,transparent_1px),linear-gradient(90deg,var(--line)_1px,transparent_1px)] bg-size-[20px_20px]"
      >
        {logoUrl && (
          <img
            src={logoUrl}
            alt=""
            className="absolute object-contain"
            style={{ width: box, height: box, right: offset, bottom: offset }}
          />
        )}
      </div>
      <div className="grid gap-3">
        <Slider
          label="Size"
          value={value.size}
          limit={limits.size}
          disabled={disabled}
          onChange={(size) => onChange({ ...value, size })}
        />
        <Slider
          label="Margin"
          value={value.margin}
          limit={limits.margin}
          disabled={disabled}
          onChange={(newMargin) => onChange({ ...value, margin: newMargin })}
        />
      </div>
    </div>
  );
}

interface SliderProps {
  label: string;
  value: number;
  limit: Limit;
  disabled: boolean;
  onChange: (value: number) => void;
}

function Slider({ label, value, limit, disabled, onChange }: SliderProps) {
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
        className="h-11 w-full disabled:opacity-50 sm:h-6"
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

export { LogoPlacementPanel };
