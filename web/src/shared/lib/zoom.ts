interface ZoomView {
  scale: number;
  x: number;
  y: number;
}

interface Point {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

interface ZoomSizes {
  stage: Size;
  content: Size;
}

const UNZOOMED: ZoomView = { scale: 1, x: 0, y: 0 };
const MAX_ZOOM = 3;
const ZOOM_STEP = 1.5;
const QUICK_ZOOM = 2;

function isZoomed(view: ZoomView): boolean {
  return view.scale > 1;
}

function sameView(one: ZoomView, other: ZoomView): boolean {
  return one.scale === other.scale && one.x === other.x && one.y === other.y;
}

function withinZoom(scale: number): number {
  return Math.min(Math.max(scale, 1), MAX_ZOOM);
}

function within(value: number, limit: number): number {
  return Math.min(Math.max(value, -limit), limit);
}

function overflow(content: number, stage: number, scale: number): number {
  return Math.max((content * scale - stage) / 2, 0);
}

function fitView(view: ZoomView, { stage, content }: ZoomSizes): ZoomView {
  const scale = withinZoom(view.scale);
  if (scale === 1) {
    return UNZOOMED;
  }

  return {
    scale,
    x: within(view.x, overflow(content.width, stage.width, scale)),
    y: within(view.y, overflow(content.height, stage.height, scale)),
  };
}

function zoomAround(
  view: ZoomView,
  toScale: number,
  fromCenter: Point,
  sizes: ZoomSizes,
): ZoomView {
  const scale = withinZoom(toScale);
  const growth = scale / view.scale;

  return fitView(
    {
      scale,
      x: fromCenter.x - (fromCenter.x - view.x) * growth,
      y: fromCenter.y - (fromCenter.y - view.y) * growth,
    },
    sizes,
  );
}

function panBy(view: ZoomView, moved: Point, sizes: ZoomSizes): ZoomView {
  return fitView(
    { scale: view.scale, x: view.x + moved.x, y: view.y + moved.y },
    sizes,
  );
}

function zoomStep(view: ZoomView, direction: 'in' | 'out'): ZoomView {
  const scale = withinZoom(
    direction === 'in' ? view.scale * ZOOM_STEP : view.scale / ZOOM_STEP,
  );
  if (scale === 1) {
    return UNZOOMED;
  }
  const growth = scale / view.scale;

  return { scale, x: view.x * growth, y: view.y * growth };
}

function toggleZoom(view: ZoomView): ZoomView {
  return isZoomed(view) ? UNZOOMED : { scale: QUICK_ZOOM, x: 0, y: 0 };
}

export {
  MAX_ZOOM,
  QUICK_ZOOM,
  UNZOOMED,
  fitView,
  isZoomed,
  panBy,
  sameView,
  toggleZoom,
  zoomAround,
  zoomStep,
};
export type { Point, Size, ZoomSizes, ZoomView };
