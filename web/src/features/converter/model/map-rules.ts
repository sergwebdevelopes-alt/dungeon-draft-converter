import { formatBytes } from '../../../shared/lib/format.ts';
import type { Config } from './types.ts';

type MapLimits = Pick<
  Config,
  'maxUploadBytes' | 'maxTotalUploadBytes' | 'maxLevels'
>;

interface AddMapsResult {
  maps: File[];
  error: string | null;
}

const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

function levelKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function mapError(
  file: File,
  maps: File[],
  total: number,
  limits: MapLimits,
): string | null {
  if (!file.name.toLowerCase().endsWith('.dd2vtt')) {
    return `"${file.name}" is not a .dd2vtt file.`;
  }
  if (file.size > limits.maxUploadBytes) {
    return `"${file.name}" is too large (max ${formatBytes(limits.maxUploadBytes)} per map).`;
  }
  if (maps.length >= limits.maxLevels) {
    return `At most ${limits.maxLevels} maps can be combined.`;
  }
  if (total + file.size > limits.maxTotalUploadBytes) {
    return `All maps together can be at most ${formatBytes(limits.maxTotalUploadBytes)}.`;
  }

  return null;
}

function addMaps(
  current: File[],
  selected: File[],
  limits: MapLimits,
): AddMapsResult {
  const maps = [...current];
  const keys = new Set(maps.map(levelKey));
  let total = maps.reduce((sum, map) => sum + map.size, 0);

  for (const file of selected) {
    if (keys.has(levelKey(file))) {
      continue;
    }

    const error = mapError(file, maps, total, limits);
    if (error) {
      return { maps, error };
    }

    maps.push(file);
    keys.add(levelKey(file));
    total += file.size;
  }

  return { maps, error: null };
}

function moveItem<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);

  return next;
}

function logoError(file: File, maxLogoBytes: number): string | null {
  if (!LOGO_TYPES.includes(file.type)) {
    return 'Logo must be a PNG, JPG or WebP image.';
  }
  if (file.size > maxLogoBytes) {
    return `This logo is too large (max ${formatBytes(maxLogoBytes)}).`;
  }

  return null;
}

export { LOGO_TYPES, addMaps, levelKey, logoError, moveItem };
export type { MapLimits };
