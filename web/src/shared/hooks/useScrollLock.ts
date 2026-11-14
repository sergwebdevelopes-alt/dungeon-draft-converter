import { useEffect } from 'react';

function hasScrollbar(root: HTMLElement, view: Window): boolean {
  return view.innerWidth - root.clientWidth > 0;
}

function useScrollLock(
  root: HTMLElement = document.documentElement,
  view: Window = window,
) {
  useEffect(() => {
    const { overflow, scrollbarGutter } = root.style;
    if (hasScrollbar(root, view)) {
      root.style.scrollbarGutter = 'stable';
    }
    root.style.overflow = 'hidden';

    return () => {
      root.style.overflow = overflow;
      root.style.scrollbarGutter = scrollbarGutter;
    };
  }, [root, view]);
}

export { useScrollLock };
