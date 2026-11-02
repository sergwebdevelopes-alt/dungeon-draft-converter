type SwipeDirection = 'left' | 'right' | 'down';

const SWIPE_PX = 80;
const DISMISS_PX = 120;

function swipeDirection(offset: {
  x: number;
  y: number;
}): SwipeDirection | null {
  const horizontal = Math.abs(offset.x) >= Math.abs(offset.y);
  if (horizontal && offset.x <= -SWIPE_PX) {
    return 'left';
  }
  if (horizontal && offset.x >= SWIPE_PX) {
    return 'right';
  }
  if (!horizontal && offset.y >= DISMISS_PX) {
    return 'down';
  }

  return null;
}

export { swipeDirection };
export type { SwipeDirection };
