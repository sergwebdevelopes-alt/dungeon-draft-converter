import { describe, expect, it } from 'vitest';
import {
  MAX_ZOOM,
  UNZOOMED,
  fitView,
  isZoomed,
  panBy,
  sameView,
  toggleZoom,
  zoomAround,
  zoomStep,
  type ZoomSizes,
} from './zoom.ts';

const WIDE: ZoomSizes = {
  stage: { width: 400, height: 300 },
  content: { width: 400, height: 200 },
};
const CENTER = { x: 0, y: 0 };

describe('isZoomed', () => {
  it('tells an enlarged picture from one at its own size', () => {
    expect(isZoomed(UNZOOMED)).toBe(false);
    expect(isZoomed({ scale: 1.01, x: 0, y: 0 })).toBe(true);
  });
});

describe('sameView', () => {
  it('compares the scale and both offsets', () => {
    const view = { scale: 2, x: 10, y: -5 };

    expect(sameView(view, { ...view })).toBe(true);
    expect(sameView(view, { ...view, scale: 2.5 })).toBe(false);
    expect(sameView(view, { ...view, x: 11 })).toBe(false);
    expect(sameView(view, { ...view, y: -6 })).toBe(false);
  });
});

describe('fitView', () => {
  it('keeps the scale between the picture’s own size and the limit', () => {
    expect(fitView({ scale: 0.4, x: 30, y: 30 }, WIDE)).toBe(UNZOOMED);
    expect(fitView({ scale: 9, x: 0, y: 0 }, WIDE).scale).toBe(MAX_ZOOM);
  });

  it('stops the picture where its edge meets the edge of the stage', () => {
    expect(fitView({ scale: 2, x: 500, y: -500 }, WIDE)).toEqual({
      scale: 2,
      x: 200,
      y: -50,
    });
    expect(fitView({ scale: 2, x: -500, y: 500 }, WIDE)).toEqual({
      scale: 2,
      x: -200,
      y: 50,
    });
  });

  it('keeps a picture centred along the side where it still fits the stage', () => {
    expect(fitView({ scale: 1.2, x: 40, y: 40 }, WIDE)).toEqual({
      scale: 1.2,
      x: 40,
      y: 0,
    });
  });

  it('leaves a view inside the limits as it is', () => {
    expect(fitView({ scale: 2, x: 120, y: -30 }, WIDE)).toEqual({
      scale: 2,
      x: 120,
      y: -30,
    });
  });
});

describe('zoomAround', () => {
  it('keeps the point under the pointer in place', () => {
    expect(zoomAround(UNZOOMED, 2, { x: 100, y: 20 }, WIDE)).toEqual({
      scale: 2,
      x: -100,
      y: -20,
    });
  });

  it('carries on from a view that is already enlarged and moved', () => {
    const view = { scale: 2, x: -100, y: 0 };

    expect(zoomAround(view, 3, { x: 100, y: 0 }, WIDE)).toEqual({
      scale: 3,
      x: -200,
      y: 0,
    });
  });

  it('goes no further than the limit', () => {
    expect(zoomAround(UNZOOMED, 10, CENTER, WIDE).scale).toBe(MAX_ZOOM);
  });

  it('goes back to the picture’s own size, centred', () => {
    expect(zoomAround({ scale: 2, x: 150, y: 40 }, 0.5, CENTER, WIDE)).toBe(
      UNZOOMED,
    );
  });
});

describe('panBy', () => {
  it('moves an enlarged picture and stops it at the edge', () => {
    const view = { scale: 2, x: 0, y: 0 };

    expect(panBy(view, { x: 60, y: -20 }, WIDE)).toEqual({
      scale: 2,
      x: 60,
      y: -20,
    });
    expect(panBy(view, { x: 900, y: 0 }, WIDE).x).toBe(200);
  });

  it('leaves a picture at its own size where it is', () => {
    expect(panBy(UNZOOMED, { x: 60, y: 60 }, WIDE)).toBe(UNZOOMED);
  });
});

describe('zoomStep', () => {
  it('goes in and out by half again, around the middle', () => {
    expect(zoomStep(UNZOOMED, 'in')).toEqual({ scale: 1.5, x: 0, y: 0 });
    expect(zoomStep({ scale: 1.5, x: 30, y: -15 }, 'in')).toEqual({
      scale: 2.25,
      x: 45,
      y: -22.5,
    });
    expect(zoomStep({ scale: 2.25, x: 45, y: -22.5 }, 'out')).toEqual({
      scale: 1.5,
      x: 30,
      y: -15,
    });
  });

  it('stops at the limit and at the picture’s own size', () => {
    expect(zoomStep({ scale: 2.5, x: 0, y: 0 }, 'in').scale).toBe(MAX_ZOOM);
    expect(zoomStep({ scale: 1.2, x: 10, y: 10 }, 'out')).toBe(UNZOOMED);
  });
});

describe('toggleZoom', () => {
  it('doubles a picture at its own size and resets an enlarged one', () => {
    expect(toggleZoom(UNZOOMED)).toEqual({ scale: 2, x: 0, y: 0 });
    expect(toggleZoom({ scale: 1.3, x: 20, y: 5 })).toBe(UNZOOMED);
  });
});
