import { describe, expect, it } from 'vitest';
import { teaserCoverWidth, teaserFrameRatio } from './teaser-frame.ts';

describe('teaserFrameRatio', () => {
  it('keeps the shape of a map between 4:5 and 4:3', () => {
    expect(teaserFrameRatio({ width: 4000, height: 3000 })).toBe(4 / 3);
    expect(teaserFrameRatio({ width: 2800, height: 2800 })).toBe(1);
    expect(teaserFrameRatio({ width: 4000, height: 5000 })).toBe(4 / 5);
  });

  it('frames a wide map at 4:3', () => {
    expect(teaserFrameRatio({ width: 4760, height: 2240 })).toBe(4 / 3);
  });

  it('frames a tall map at 4:5', () => {
    expect(teaserFrameRatio({ width: 1400, height: 2240 })).toBe(4 / 5);
  });
});

describe('teaserCoverWidth', () => {
  it('makes the map layer at least as wide and as tall as the frame', () => {
    expect(teaserCoverWidth({ width: 4760, height: 2240 })).toBe(
      `max(100cqw, calc(100cqh * ${4760 / 2240}))`,
    );
  });
});
