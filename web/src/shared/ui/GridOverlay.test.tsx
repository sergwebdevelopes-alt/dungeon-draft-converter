import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GRID_STROKE } from '../../../../src/core/grid-stroke.ts';
import { GridOverlay } from './GridOverlay.tsx';

function group(container: HTMLElement) {
  return container.querySelector('g')!;
}

describe('GridOverlay', () => {
  it('draws the grid like the export: black, faint, scaled to the square size', () => {
    const { container } = render(<GridOverlay columns={4} rows={3} />);

    expect(container.querySelector('svg')).toHaveAttribute(
      'viewBox',
      '0 0 4 3',
    );
    expect(group(container)).toHaveAttribute('stroke', GRID_STROKE.color);
    expect(group(container)).toHaveAttribute(
      'stroke-opacity',
      String(GRID_STROKE.opacity),
    );
    expect(group(container)).toHaveAttribute(
      'stroke-width',
      String(GRID_STROKE.width / GRID_STROKE.referenceGridSize),
    );
    expect(group(container)).toHaveAttribute(
      'stroke-dasharray',
      GRID_STROKE.dashArray
        .map((dash) => dash / GRID_STROKE.referenceGridSize)
        .join(' '),
    );
  });

  it('includes the outer edges like the export', () => {
    const { container } = render(<GridOverlay columns={4} rows={3} />);

    expect(container.querySelectorAll('line')).toHaveLength(5 + 4);
  });
});
