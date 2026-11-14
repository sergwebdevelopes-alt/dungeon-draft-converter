import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  UNZOOMED,
  fitView,
  isZoomed,
  sameView,
  type ZoomSizes,
  type ZoomView,
} from '@/shared/lib/zoom.ts';
import { watchGestures } from '@/shared/lib/zoom-gestures.ts';

interface ZoomControls {
  view: ZoomView;
  onChange: (view: ZoomView) => void;
  onPinch: (pinching: boolean) => void;
  wheelNeedsKey?: boolean;
}

interface ZoomPanProps {
  zoom?: ZoomControls;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

type Motion = 'bounce' | 'follow' | 'still';

const WHEEL_IDLE_MS = 220;
const MOTIONS: Record<Motion, string> = {
  bounce: 'transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  follow: 'transform 140ms ease-out',
  still: 'none',
};

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
      wheelNeedsKey: () => latest.current.zoom?.wheelNeedsKey === true,
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
