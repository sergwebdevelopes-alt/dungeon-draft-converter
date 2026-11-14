import {
  QUICK_ZOOM,
  UNZOOMED,
  isZoomed,
  panBy,
  zoomAround,
  type Point,
  type ZoomSizes,
  type ZoomView,
} from './zoom.ts';

const WHEEL_SPEED = 0.002;

interface Gestures {
  view: () => ZoomView;
  sizes: () => ZoomSizes;
  change: (view: ZoomView) => void;
  onPinch: (pinching: boolean) => void;
  onHold: (holding: boolean) => void;
  onWheel: () => void;
}

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

export { watchGestures };
export type { Gestures };
