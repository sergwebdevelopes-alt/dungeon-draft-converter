import type { ReactNode } from 'react';
import * as m from 'motion/react-m';
import { swipeDirection } from './swipe.ts';

interface SwipeableProps {
  className?: string;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onSwipeDown: () => void;
  children: ReactNode;
}

function Swipeable({
  className,
  onSwipeLeft,
  onSwipeRight,
  onSwipeDown,
  children,
}: SwipeableProps) {
  const handlers = {
    left: onSwipeLeft,
    right: onSwipeRight,
    down: onSwipeDown,
  };

  return (
    <m.div
      className={className}
      style={{ touchAction: 'none' }}
      drag
      dragDirectionLock
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.5}
      onDragEnd={(_, info) => {
        const direction = swipeDirection(info.offset);
        if (direction) {
          handlers[direction]();
        }
      }}
    >
      {children}
    </m.div>
  );
}

export { Swipeable };
