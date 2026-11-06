import type { KeyValueStore } from '../../../shared/storage/index.ts';
import { clampPlacement, defaultPlacement } from './placement.ts';
import type { Config, LogoPlacement, Variant } from './types.ts';

const STORAGE_KEY = 'dungeon-draft-converter:settings';

interface Settings {
  presets: string[];
  variants: Variant[];
  placement: LogoPlacement;
  foundry: boolean;
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

function loadSettings(config: Config, store: KeyValueStore): Settings {
  const saved = store.read(STORAGE_KEY);
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
    foundry: record.foundry === true,
  };
}

function saveSettings(settings: Settings, store: KeyValueStore): void {
  store.write(STORAGE_KEY, settings);
}

export { STORAGE_KEY, loadSettings, saveSettings };
export type { Settings };
