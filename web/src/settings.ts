import type { Config, LogoPlacement, Variant } from './api.ts';
import { clampPlacement, defaultPlacement } from './LogoPlacement.tsx';

const STORAGE_KEY = 'dungeon-draft-converter:settings';

interface Settings {
  presets: string[];
  variants: Variant[];
  placement: LogoPlacement;
}

function pickKnown<T extends string>(
  saved: unknown,
  allowed: readonly T[],
): T[] {
  if (!Array.isArray(saved)) {
    return [...allowed];
  }
  const known = allowed.filter((item) => saved.includes(item));
  return known.length > 0 ? known : [...allowed];
}

function readPlacement(saved: unknown, config: Config): LogoPlacement {
  if (typeof saved !== 'object' || saved === null) {
    return defaultPlacement(config.logo);
  }
  const { size, margin } = saved as Record<string, unknown>;
  if (
    typeof size !== 'number' ||
    typeof margin !== 'number' ||
    !Number.isFinite(size) ||
    !Number.isFinite(margin)
  ) {
    return defaultPlacement(config.logo);
  }
  return clampPlacement({ size, margin }, config.logo);
}

function readStorage(): unknown {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
  } catch {
    return null;
  }
}

function loadSettings(config: Config): Settings {
  const saved = readStorage();
  const record =
    typeof saved === 'object' && saved !== null
      ? (saved as Record<string, unknown>)
      : {};

  return {
    presets: pickKnown(
      record.presets,
      config.presets.map((preset) => preset.name),
    ),
    variants: pickKnown(record.variants, config.variants),
    placement: readPlacement(record.placement, config),
  };
}

function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    return;
  }
}

export { loadSettings, saveSettings };
