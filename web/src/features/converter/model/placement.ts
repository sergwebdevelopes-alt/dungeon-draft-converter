import type { LogoLimits, LogoPlacement } from './types.ts';

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

export { clamp, clampPlacement, defaultPlacement, isDefaultPlacement };
export type { Limit };
