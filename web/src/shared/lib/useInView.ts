import { useEffect, useRef, useState } from 'react';

interface Visibility {
  onScreen: boolean;
  inView: boolean;
}

const EVERYWHERE: Visibility = { onScreen: true, inView: true };
const NOWHERE: Visibility = { onScreen: false, inView: false };

function useInView<T extends Element>(visibleShare: number) {
  const target = useRef<T | null>(null);
  const [visibility, setVisibility] = useState(NOWHERE);

  useEffect(() => {
    const element = target.current;
    if (!element) {
      return;
    }
    if (typeof IntersectionObserver === 'undefined') {
      setVisibility(EVERYWHERE);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisibility({
          onScreen: entry.isIntersecting,
          inView: entry.intersectionRatio >= visibleShare,
        });
      },
      { threshold: [0, visibleShare] },
    );
    observer.observe(element);

    return () => observer.disconnect();
  }, [visibleShare]);

  return { target, ...visibility };
}

export { useInView };
