type SwipeResult = 'previous' | 'next' | 'dismiss' | 'stay';

interface Point {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

interface Neighbours {
  previous: boolean;
  next: boolean;
}

const TURN_SHARE = 0.25;
const DISMISS_SHARE = 0.2;
const FLING_SPEED = 500;

function settleSwipe(
  offset: Point,
  velocity: Point,
  size: Size,
  neighbours: Neighbours,
): SwipeResult {
  if (Math.abs(offset.x) >= Math.abs(offset.y)) {
    const far =
      Math.abs(offset.x) > size.width * TURN_SHARE ||
      Math.abs(velocity.x) > FLING_SPEED;
    if (far && offset.x < 0 && velocity.x <= 0 && neighbours.next) {
      return 'next';
    }
    if (far && offset.x > 0 && velocity.x >= 0 && neighbours.previous) {
      return 'previous';
    }
    return 'stay';
  }

  const far =
    offset.y > size.height * DISMISS_SHARE || velocity.y > FLING_SPEED;

  return far && offset.y > 0 && velocity.y >= 0 ? 'dismiss' : 'stay';
}

export { settleSwipe };
export type { SwipeResult };
