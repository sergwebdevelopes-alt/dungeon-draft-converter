import { describe, expect, it } from 'vitest';
import { swipeDirection } from './swipe.ts';

describe('swipeDirection', () => {
  it('reads a long horizontal drag as a swipe', () => {
    expect(swipeDirection({ x: -120, y: 10 })).toBe('left');
    expect(swipeDirection({ x: 120, y: -10 })).toBe('right');
  });

  it('reads a long drag down as dismiss', () => {
    expect(swipeDirection({ x: 10, y: 160 })).toBe('down');
  });

  it('ignores short drags and drags up', () => {
    expect(swipeDirection({ x: -40, y: 0 })).toBeNull();
    expect(swipeDirection({ x: 0, y: 90 })).toBeNull();
    expect(swipeDirection({ x: 0, y: -200 })).toBeNull();
  });
});
