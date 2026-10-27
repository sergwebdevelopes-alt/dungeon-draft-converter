import { useId } from 'react';
import type { LogoLimits, LogoPlacement } from './api.ts';
import { useObjectUrl } from './useObjectUrl.ts';

const PREVIEW_HEIGHT = 80;

type Limit = LogoLimits[keyof LogoLimits];

function clamp(value: number, { min, max }: Limit): number {
  return Math.min(max, Math.max(min, value));
}

function clampPlacement(
  placement: LogoPlacement,
  limits: LogoLimits,
): LogoPlacement {
  return {
    size: clamp(placement.size, limits.size),
    margin: clamp(placement.margin, limits.margin),
  };
}

function defaultPlacement(limits: LogoLimits): LogoPlacement {
  return { size: limits.size.default, margin: limits.margin.default };
}

function isDefaultPlacement(
  placement: LogoPlacement,
  limits: LogoLimits,
): boolean {
  return (
    placement.size === limits.size.default &&
    placement.margin === limits.margin.default
  );
}

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
  const margin = (PREVIEW_HEIGHT * value.margin) / 100;
  return (
    <div className="placement">
      <div className="placement-preview" aria-hidden="true">
        {logoUrl && (
          <img
            src={logoUrl}
            alt=""
            style={{ width: box, height: box, right: margin, bottom: margin }}
          />
        )}
      </div>
      <div className="placement-sliders">
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
          onChange={(margin) => onChange({ ...value, margin })}
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
    <div className="slider">
      <label htmlFor={id}>
        <span>{label}</span>
        <span className="slider-value">{value}%</span>
      </label>
      <input
        id={id}
        type="range"
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

export {
  LogoPlacementPanel,
  clampPlacement,
  defaultPlacement,
  isDefaultPlacement,
};
