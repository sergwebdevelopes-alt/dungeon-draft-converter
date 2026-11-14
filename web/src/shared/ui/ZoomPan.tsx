import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  QUICK_ZOOM,
  UNZOOMED,
  fitView,
  isZoomed,
  panBy,
  sameView,
  zoomAround,
  type Point,
  type ZoomSizes,
  type ZoomView,
} from '@/shared/lib/zoom.ts';

interface ZoomControls {
  view: ZoomView;
  onChange: (view: ZoomView) => void;
  onPinch: (pinching: boolean) => void;
}

interface ZoomPanProps {
  zoom?: ZoomControls;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

interface Gestures {
  view: () => ZoomView;
  sizes: () => ZoomSizes;
  change: (view: ZoomView) => void;
  onPinch: (pinching: boolean) => void;
  onHold: (holding: boolean) => void;
  onWheel: () => void;
}

type Motion = 'bounce' | 'follow' | 'still';

const WHEEL_SPEED = 0.002;
const WHEEL_IDLE_MS = 220;
const MOTIONS: Record<Motion, string> = {
  bounce: 'transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  follow: 'transform 140ms ease-out',
  still: 'none',
};

function distance(one: Point, other: Point): number {
  return Math.hypot(one.x - other.x, one.y - other.y);
}

function middle(one: Point, other: Point): Point {
  return { x: (one.x + other.x) / 2, y: (one.y + other.y) / 2 };
}

function watchGestures(stage: HTMLElement, gestures: Gestures): () => void {
  const fingers = new Map<number, Point>();

  function fromCenter(event: MouseEvent): Point {
    const box = stage.getBoundingClientRect();

    return {
      x: event.clientX - box.left - box.width / 2,
      y: event.clientY - box.top - box.height / 2,
    };
  }

  function otherFinger(pointerId: number): Point | undefined {
    return [...fingers].find(([id]) => id !== pointerId)?.[1];
  }

  function pinch(before: Point, now: Point, other: Point) {
    const view = gestures.view();
    const sizes = gestures.sizes();
    const scale = (view.scale * distance(now, other)) / distance(before, other);
    const center = middle(now, other);
    const centerBefore = middle(before, other);

    gestures.change(
      panBy(
        zoomAround(view, scale, centerBefore, sizes),
        { x: center.x - centerBefore.x, y: center.y - centerBefore.y },
        sizes,
      ),
    );
  }

  function handleWheel(event: WheelEvent) {
    event.preventDefault();
    gestures.onWheel();
    const view = gestures.view();
    const scale = view.scale * Math.exp(-event.deltaY * WHEEL_SPEED);

    gestures.change(
      zoomAround(view, scale, fromCenter(event), gestures.sizes()),
    );
  }

  function handleDoubleClick(event: MouseEvent) {
    const view = gestures.view();

    gestures.change(
      isZoomed(view)
        ? UNZOOMED
        : zoomAround(view, QUICK_ZOOM, fromCenter(event), gestures.sizes()),
    );
  }

  function handlePointerDown(event: PointerEvent) {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }
    fingers.set(event.pointerId, fromCenter(event));

    if (fingers.size === 2) {
      gestures.onPinch(true);
    }
    if (fingers.size === 2 || isZoomed(gestures.view())) {
      stage.setPointerCapture?.(event.pointerId);
      gestures.onHold(true);
    }
  }

  function handlePointerMove(event: PointerEvent) {
    const before = fingers.get(event.pointerId);
    if (!before) {
      return;
    }
    const now = fromCenter(event);
    const other = otherFinger(event.pointerId);
    fingers.set(event.pointerId, now);

    if (other) {
      pinch(before, now, other);
    } else if (isZoomed(gestures.view())) {
      gestures.change(
        panBy(
          gestures.view(),
          { x: now.x - before.x, y: now.y - before.y },
          gestures.sizes(),
        ),
      );
    }
  }

  function handlePointerUp(event: PointerEvent) {
    if (!fingers.delete(event.pointerId)) {
      return;
    }
    if (fingers.size === 1) {
      gestures.onPinch(false);
    }
    if (fingers.size === 0) {
      gestures.onHold(false);
    }
  }

  function keepPictureInPlace(event: DragEvent) {
    event.preventDefault();
  }

  stage.addEventListener('wheel', handleWheel, { passive: false });
  stage.addEventListener('dragstart', keepPictureInPlace);
  stage.addEventListener('dblclick', handleDoubleClick);
  stage.addEventListener('pointerdown', handlePointerDown);
  stage.addEventListener('pointermove', handlePointerMove);
  stage.addEventListener('pointerup', handlePointerUp);
  stage.addEventListener('pointercancel', handlePointerUp);

  return () => {
    stage.removeEventListener('wheel', handleWheel);
    stage.removeEventListener('dragstart', keepPictureInPlace);
    stage.removeEventListener('dblclick', handleDoubleClick);
    stage.removeEventListener('pointerdown', handlePointerDown);
    stage.removeEventListener('pointermove', handlePointerMove);
    stage.removeEventListener('pointerup', handlePointerUp);
    stage.removeEventListener('pointercancel', handlePointerUp);
    gestures.onPinch(false);
  };
}

function contentStyle(view: ZoomView, motion: Motion): CSSProperties {
  return {
    transform: isZoomed(view)
      ? `translate(${view.x}px, ${view.y}px) scale(${view.scale})`
      : undefined,
    transition: MOTIONS[motion],
  };
}

function useWheeling(): [boolean, () => void] {
  const [wheeling, setWheeling] = useState(false);
  const idle = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(idle.current), []);

  function noteWheel() {
    clearTimeout(idle.current);
    setWheeling(true);
    idle.current = setTimeout(() => setWheeling(false), WHEEL_IDLE_MS);
  }

  return [wheeling, noteWheel];
}

function chooseMotion(
  zoomable: boolean,
  holding: boolean,
  wheeling: boolean,
): Motion {
  if (!zoomable || holding) {
    return 'still';
  }

  return wheeling ? 'follow' : 'bounce';
}

function cursor(view: ZoomView, holding: boolean): string | undefined {
  if (!isZoomed(view)) {
    return undefined;
  }

  return holding ? 'grabbing' : 'grab';
}

function ZoomPan({ zoom, className, style, children }: ZoomPanProps) {
  const stage = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [holding, setHolding] = useState(false);
  const [wheeling, noteWheel] = useWheeling();
  const view = zoom?.view ?? UNZOOMED;
  const latest = useRef({ view, zoom, noteWheel });
  latest.current = { view, zoom, noteWheel };
  const zoomable = zoom !== undefined;

  function sizes(): ZoomSizes {
    const box = stage.current?.getBoundingClientRect();

    return {
      stage: { width: box?.width ?? 0, height: box?.height ?? 0 },
      content: {
        width: content.current?.offsetWidth ?? 0,
        height: content.current?.offsetHeight ?? 0,
      },
    };
  }

  useLayoutEffect(() => {
    const fitted = fitView(view, sizes());
    if (zoom && !sameView(fitted, view)) {
      zoom.onChange(fitted);
    }
  });

  useEffect(() => {
    if (!zoomable || !stage.current) {
      return;
    }

    return watchGestures(stage.current, {
      view: () => latest.current.view,
      sizes,
      change: (next) => {
        latest.current.view = next;
        latest.current.zoom?.onChange(next);
      },
      onPinch: (pinching) => latest.current.zoom?.onPinch(pinching),
      onHold: setHolding,
      onWheel: () => latest.current.noteWheel(),
    });
  }, [zoomable]);

  return (
    <div
      ref={stage}
      className={className}
      style={{ ...style, cursor: cursor(view, holding), userSelect: 'none' }}
    >
      <div
        ref={content}
        style={contentStyle(view, chooseMotion(zoomable, holding, wheeling))}
      >
        {children}
      </div>
    </div>
  );
}

export { ZoomPan };
export type { ZoomControls };
