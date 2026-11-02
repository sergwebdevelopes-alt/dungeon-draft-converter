import { useEffect, useState } from 'react';

function prefersReducedMotion(): boolean {
  return (
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  );
}

function useRotation(count: number, intervalMs: number, paused = false) {
  const [index, setIndex] = useState(0);
  const [restartKey, setRestartKey] = useState(0);

  useEffect(() => {
    if (paused || count < 2 || prefersReducedMotion()) {
      return;
    }

    const timer = setInterval(() => {
      if (!document.hidden) {
        setIndex((current) => (current + 1) % count);
      }
    }, intervalMs);
    return () => clearInterval(timer);
  }, [count, intervalMs, paused, restartKey]);

  function select(next: number) {
    setIndex(next);
    setRestartKey((key) => key + 1);
  }

  return { index: count > 0 ? index % count : 0, select };
}

export { useRotation };
