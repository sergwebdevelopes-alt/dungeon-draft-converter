import { useEffect, useState } from 'react';

const TICK_MS = 1000;

function useElapsed(startedAt: number): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  return Math.max(0, now - startedAt);
}

export { useElapsed };
