import { describe, expect, it } from 'vitest';
import {
  clampPlacement,
  defaultPlacement,
  isDefaultPlacement,
} from './placement.ts';
import { TEST_CONFIG } from './test-config.ts';

const LIMITS = TEST_CONFIG.logo;

describe('placement', () => {
  it('clamps size and margin into their limits', () => {
    expect(clampPlacement({ size: 1, margin: 9 }, LIMITS)).toEqual({
      size: 2,
      margin: 5,
    });
    expect(clampPlacement({ size: 12, margin: 2 }, LIMITS)).toEqual({
      size: 12,
      margin: 2,
    });
  });

  it('knows the default placement', () => {
    const placement = defaultPlacement(LIMITS);

    expect(placement).toEqual({ size: 10, margin: 3 });
    expect(isDefaultPlacement(placement, LIMITS)).toBe(true);
    expect(isDefaultPlacement({ size: 11, margin: 3 }, LIMITS)).toBe(false);
  });
});
