import { useEffect, useRef, useState } from 'react';
import {
  UNZOOMED,
  toggleZoom,
  zoomStep,
  type ZoomView,
} from '@/shared/lib/zoom.ts';

interface Zoom {
  view: ZoomView;
  setView: (view: ZoomView) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  toggle: () => void;
}

function useZoom(subject: unknown): Zoom {
  const [zoomed, setZoomed] = useState({ subject, view: UNZOOMED });
  if (zoomed.subject !== subject) {
    setZoomed({ subject, view: UNZOOMED });
  }
  const { view } = zoomed;

  const zoom: Zoom = {
    view,
    setView: (next) => setZoomed({ subject, view: next }),
    zoomIn: () => setZoomed({ subject, view: zoomStep(view, 'in') }),
    zoomOut: () => setZoomed({ subject, view: zoomStep(view, 'out') }),
    reset: () => setZoomed({ subject, view: UNZOOMED }),
    toggle: () => setZoomed({ subject, view: toggleZoom(view) }),
  };
  const latest = useRef(zoom);
  latest.current = zoom;

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.target instanceof HTMLInputElement) {
        return;
      }
      if (event.key === '+' || event.key === '=') {
        latest.current.zoomIn();
      }
      if (event.key === '-') {
        latest.current.zoomOut();
      }
      if (event.key === '0') {
        latest.current.reset();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return zoom;
}

export { useZoom };
export type { Zoom };
