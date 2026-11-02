import type { FormatPreset } from './types.ts';

function presetLabel(preset: FormatPreset): string {
  return `${preset.format.toUpperCase()} · ${preset.ppi} px`;
}

function imageCount(
  mapCount: number,
  presetCount: number,
  variantCount: number,
): number {
  return mapCount === 0 ? 0 : presetCount * variantCount;
}

function zipName(maps: File[]): string {
  const stem = maps[0].name.replace(/\.dd2vtt$/i, '');

  return maps.length > 1 ? `${stem}_merged.zip` : `${stem}.zip`;
}

export { imageCount, presetLabel, zipName };
