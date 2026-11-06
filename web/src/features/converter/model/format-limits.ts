import type { FormatPreset } from './types.ts';

interface MapSize {
  columns: number;
  rows: number;
}

function isTooLarge(
  preset: FormatPreset,
  { columns, rows }: MapSize,
  maxOutputPixels: number,
): boolean {
  if (preset.format === 'webp') {
    return false;
  }

  return columns * preset.ppi * (rows * preset.ppi) > maxOutputPixels;
}

function tooLargePresets(
  presets: readonly FormatPreset[],
  size: MapSize | null,
  maxOutputPixels: number,
): string[] {
  if (!size) {
    return [];
  }

  return presets
    .filter((preset) => isTooLarge(preset, size, maxOutputPixels))
    .map((preset) => preset.name);
}

export { tooLargePresets };
export type { MapSize };
