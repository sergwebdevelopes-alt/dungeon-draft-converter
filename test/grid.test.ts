import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createGridSvg, GRID_STROKE } from '../src/grid.ts';

function countLines(svg: string): number {
  return svg.match(/<line /g)?.length ?? 0;
}

describe('createGridSvg', () => {
  it('draws lines at every grid step including both edges', () => {
    const svg = createGridSvg(100, 100, 50);
    assert.equal(countLines(svg), 6);
  });

  it('sets the svg dimensions to the image size', () => {
    const svg = createGridSvg(100, 80, 50);
    assert.match(svg, /<svg width="100" height="80">/);
  });

  it('handles a grid size larger than the image', () => {
    const svg = createGridSvg(10, 10, 50);
    assert.equal(countLines(svg), 2);
  });

  it('applies the configured color and opacity', () => {
    const svg = createGridSvg(10, 10, 5);
    assert.match(svg, new RegExp(`stroke="${GRID_STROKE.color}"`));
    assert.match(svg, new RegExp(`stroke-opacity="${GRID_STROKE.opacity}"`));
  });

  it('uses the reference stroke style at the reference grid size', () => {
    const svg = createGridSvg(280, 280, 140);
    assert.match(svg, /stroke-width="2.4"/);
    assert.match(svg, /stroke-dasharray="4.8 3.2"/);
  });

  it('scales the stroke width and dash pattern with the grid size', () => {
    const at70 = createGridSvg(140, 140, 70);
    assert.match(at70, /stroke-width="1.2"/);
    assert.match(at70, /stroke-dasharray="2.4 1.6"/);

    const at280 = createGridSvg(560, 560, 280);
    assert.match(at280, /stroke-width="4.8"/);
    assert.match(at280, /stroke-dasharray="9.6 6.4"/);
  });
});
