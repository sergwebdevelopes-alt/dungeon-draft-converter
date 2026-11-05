import { useEffect, useRef } from 'react';

const NEAR = '800px';

interface NearViewportOptions {
  enabled: boolean;
  watch: unknown;
}

function useNearViewport<T extends Element>(
  onNear: () => void,
  { enabled, watch }: NearViewportOptions,
) {
  const target = useRef<T | null>(null);
  const latest = useRef(onNear);

  useEffect(() => {
    latest.current = onNear;
  }, [onNear]);

  useEffect(() => {
    const element = target.current;
    if (!enabled || !element || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          latest.current();
        }
      },
      { rootMargin: NEAR },
    );
    observer.observe(element);

    return () => observer.disconnect();
  }, [enabled, watch]);

  return target;
}

export { useNearViewport };
