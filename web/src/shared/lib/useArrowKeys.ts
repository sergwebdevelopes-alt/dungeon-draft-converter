import { useEffect, useRef } from 'react';

function useArrowKeys(
  enabled: boolean,
  onPrevious: () => void,
  onNext: () => void,
) {
  const latest = useRef({ onPrevious, onNext });
  latest.current = { onPrevious, onNext };

  useEffect(() => {
    if (!enabled) {
      return;
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.target instanceof HTMLInputElement) {
        return;
      }
      if (event.key === 'ArrowLeft') {
        latest.current.onPrevious();
      }
      if (event.key === 'ArrowRight') {
        latest.current.onNext();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
}

export { useArrowKeys };
