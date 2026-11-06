import { describe, expect, it } from 'vitest';
import { settleSwipe } from './swipe.ts';

const SIZE = { width: 400, height: 600 };
const BOTH = { previous: true, next: true };
const STILL = { x: 0, y: 0 };

describe('settleSwipe', () => {
  it('turns to a neighbour after a quarter of the width', () => {
    expect(settleSwipe({ x: -101, y: 5 }, STILL, SIZE, BOTH)).toBe('next');
    expect(settleSwipe({ x: 101, y: -5 }, STILL, SIZE, BOTH)).toBe('previous');
    expect(settleSwipe({ x: -99, y: 0 }, STILL, SIZE, BOTH)).toBe('stay');
  });

  it('turns on a quick flick even when the drag is short', () => {
    expect(settleSwipe({ x: -30, y: 0 }, { x: -800, y: 0 }, SIZE, BOTH)).toBe(
      'next',
    );
    expect(settleSwipe({ x: 30, y: 0 }, { x: 800, y: 0 }, SIZE, BOTH)).toBe(
      'previous',
    );
  });

  it('stays when there is no neighbour that way', () => {
    expect(
      settleSwipe({ x: -300, y: 0 }, STILL, SIZE, { ...BOTH, next: false }),
    ).toBe('stay');
    expect(
      settleSwipe({ x: 300, y: 0 }, STILL, SIZE, { ...BOTH, previous: false }),
    ).toBe('stay');
  });

  it('stays when the finger flicks back against the drag', () => {
    expect(settleSwipe({ x: -200, y: 0 }, { x: 600, y: 0 }, SIZE, BOTH)).toBe(
      'stay',
    );
  });

  it('closes after a fifth of the height down or a quick flick down', () => {
    expect(settleSwipe({ x: 0, y: 121 }, STILL, SIZE, BOTH)).toBe('dismiss');
    expect(settleSwipe({ x: 0, y: 40 }, { x: 0, y: 900 }, SIZE, BOTH)).toBe(
      'dismiss',
    );
    expect(settleSwipe({ x: 0, y: 100 }, STILL, SIZE, BOTH)).toBe('stay');
  });

  it('never closes upwards or against the last flick', () => {
    expect(settleSwipe({ x: 0, y: -300 }, { x: 0, y: -900 }, SIZE, BOTH)).toBe(
      'stay',
    );
    expect(settleSwipe({ x: 0, y: -50 }, { x: 0, y: 900 }, SIZE, BOTH)).toBe(
      'stay',
    );
    expect(settleSwipe({ x: 0, y: 200 }, { x: 0, y: -600 }, SIZE, BOTH)).toBe(
      'stay',
    );
  });
});
