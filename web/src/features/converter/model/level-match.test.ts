import { describe, expect, it } from 'vitest';
import { levelMismatch, type LevelGrid } from './level-match.ts';

const GRID: LevelGrid = {
  originX: 0,
  originY: 0,
  columns: 128,
  rows: 88,
  pixelsPerSquare: 70,
};

function level(name: string, changes: Partial<LevelGrid> = {}) {
  return { name: `${name}.dd2vtt`, grid: { ...GRID, ...changes } };
}

describe('levelMismatch', () => {
  it('finds nothing wrong with levels of the same map', () => {
    expect(levelMismatch([level('L1'), level('L2'), level('L3')])).toBeNull();
  });

  it('finds nothing to compare in one level or in none', () => {
    expect(levelMismatch([level('L1')])).toBeNull();
    expect(levelMismatch([])).toBeNull();
  });

  it('says which level has another number of squares than the main map', () => {
    expect(
      levelMismatch([level('L1'), level('L2'), level('Inn', { columns: 60 })]),
    ).toBe(
      '"Inn.dd2vtt" is 60 × 88 squares at 70 px per square, but the main map "L1.dd2vtt" is 128 × 88 squares at 70 px per square. Levels must be exports of the same map at the same size.',
    );
    expect(levelMismatch([level('L1'), level('Inn', { rows: 44 })])).toContain(
      '"Inn.dd2vtt" is 128 × 44 squares',
    );
  });

  it('says which level was exported at another resolution', () => {
    expect(
      levelMismatch([level('L1'), level('L2', { pixelsPerSquare: 140 })]),
    ).toBe(
      '"L2.dd2vtt" is 128 × 88 squares at 140 px per square, but the main map "L1.dd2vtt" is 128 × 88 squares at 70 px per square. Levels must be exports of the same map at the same size.',
    );
  });

  it('says which level starts at another point of the grid', () => {
    const shifted =
      '"L2.dd2vtt" starts at a different point of the grid than the main map "L1.dd2vtt". Levels must be exports of the same map.';

    expect(levelMismatch([level('L1'), level('L2', { originX: 4 })])).toBe(
      shifted,
    );
    expect(levelMismatch([level('L1'), level('L2', { originY: -2 })])).toBe(
      shifted,
    );
  });

  it('names the first level that does not match', () => {
    expect(
      levelMismatch([
        level('L1'),
        level('L2', { originX: 1 }),
        level('L3', { columns: 5 }),
      ]),
    ).toContain('"L2.dd2vtt" starts at a different point');
  });
});
