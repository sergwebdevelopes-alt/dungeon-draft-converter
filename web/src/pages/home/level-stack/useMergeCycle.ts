import { useEffect, useRef, useState } from 'react';
import { FIRST_MERGE_MS, HOLD_MS } from './scene.ts';

function prefersReducedMotion(): boolean {
  return (
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  );
}

interface MergeCycle {
  inView: boolean;
  onScreen: boolean;
  beforeMerge: () => void;
}

function useMergeCycle({ inView, onScreen, beforeMerge }: MergeCycle): boolean {
  const [merged, setMerged] = useState(false);
  const latest = useRef({ merged, beforeMerge });
  latest.current = { merged, beforeMerge };

  useEffect(() => {
    if (!onScreen) {
      setMerged(false);
    }
  }, [onScreen]);

  useEffect(() => {
    if (!inView || prefersReducedMotion()) {
      return;
    }

    let timer: ReturnType<typeof setTimeout>;
    function show(next: boolean, afterMs: number) {
      timer = setTimeout(() => {
        if (next) {
          latest.current.beforeMerge();
        }
        setMerged(next);
        show(!next, HOLD_MS);
      }, afterMs);
    }

    show(
      !latest.current.merged,
      latest.current.merged ? HOLD_MS : FIRST_MERGE_MS,
    );
    return () => clearTimeout(timer);
  }, [inView]);

  return merged;
}

export { useMergeCycle };
