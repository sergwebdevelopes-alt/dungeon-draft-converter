import { describe, expect, it } from 'vitest';
import { tooLargePresets } from './format-limits.ts';
import type { FormatPreset } from './types.ts';

const PRESETS: FormatPreset[] = [
  { name: 'JPG_70', ppi: 70, format: 'jpg' },
  { name: 'JPG_140', ppi: 140, format: 'jpg' },
  { name: 'JPG_300', ppi: 300, format: 'jpg' },
  { name: 'WEBP_140', ppi: 140, format: 'webp' },
];
const LIMIT = 250_000_000;

describe('tooLargePresets', () => {
  it('lists the JPG formats whose image would pass the pixel limit', () => {
    expect(tooLargePresets(PRESETS, { columns: 120, rows: 88 }, LIMIT)).toEqual(
      ['JPG_300'],
    );
    expect(
      tooLargePresets(PRESETS, { columns: 200, rows: 200 }, LIMIT),
    ).toEqual(['JPG_140', 'JPG_300']);
  });

  it('allows an image of exactly the limit', () => {
    const square = { name: 'JPG_100', ppi: 100, format: 'jpg' as const };

    expect(
      tooLargePresets([square], { columns: 50, rows: 50 }, 25_000_000),
    ).toEqual([]);
    expect(
      tooLargePresets([square], { columns: 50, rows: 51 }, 25_000_000),
    ).toEqual(['JPG_100']);
  });

  it('never limits WebP, which the server shrinks to fit', () => {
    expect(
      tooLargePresets(PRESETS, { columns: 1000, rows: 1000 }, LIMIT),
    ).not.toContain('WEBP_140');
  });

  it('limits nothing while the map size is unknown', () => {
    expect(tooLargePresets(PRESETS, null, LIMIT)).toEqual([]);
  });
});
