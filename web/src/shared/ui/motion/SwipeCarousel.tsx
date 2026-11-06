import {
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  animate,
  useMotionValue,
  useTransform,
  type PanInfo,
} from 'motion/react';
import * as m from 'motion/react-m';
import { settleSwipe } from './swipe.ts';

interface Slide {
  key: string;
  content: ReactNode;
}

interface SwipeCarouselProps {
  previous: Slide | null;
  current: Slide;
  next: Slide | null;
  onPrevious: () => void;
  onNext: () => void;
  onDismiss: () => void;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

const SPRING = { type: 'spring', stiffness: 380, damping: 40 } as const;
const FAR = 100_000;

function slideStyle(place: number): CSSProperties {
  return { transform: `translateX(${place * 100}%)` };
}

function SwipeCarousel({
  previous,
  current,
  next,
  onPrevious,
  onNext,
  onDismiss,
  className = '',
  style,
  children,
}: SwipeCarouselProps) {
  const frame = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, 400], [1, 0.3]);

  useLayoutEffect(() => {
    x.set(0);
    y.set(0);
  }, [current.key, x, y]);

  async function handleDragEnd(info: PanInfo) {
    const box = frame.current?.getBoundingClientRect();
    if (!box) {
      return;
    }

    const result = settleSwipe(info.offset, info.velocity, box, {
      previous: previous !== null,
      next: next !== null,
    });

    if (result === 'next') {
      await animate(x, -box.width, SPRING);
      onNext();
    } else if (result === 'previous') {
      await animate(x, box.width, SPRING);
      onPrevious();
    } else if (result === 'dismiss') {
      await animate(y, box.height, SPRING);
      onDismiss();
    } else {
      void animate(x, 0, SPRING);
      void animate(y, 0, SPRING);
    }
  }

  return (
    <div ref={frame} className={`overflow-hidden ${className}`} style={style}>
      <m.div
        data-testid="swipe-track"
        className="absolute inset-0"
        style={{ x, y, opacity, touchAction: 'none' }}
        drag
        dragDirectionLock
        dragMomentum={false}
        dragElastic={0.2}
        dragConstraints={{
          left: next ? -FAR : 0,
          right: previous ? FAR : 0,
          top: 0,
          bottom: FAR,
        }}
        onDragEnd={(_event, info) => void handleDragEnd(info)}
      >
        {[previous, current, next].map(
          (slide, index) =>
            slide && (
              <div
                key={slide.key}
                aria-hidden={slide === current ? undefined : true}
                className="absolute inset-0"
                style={slideStyle(index - 1)}
              >
                {slide.content}
              </div>
            ),
        )}
      </m.div>
      {children}
    </div>
  );
}

export { SwipeCarousel };
export type { Slide };
