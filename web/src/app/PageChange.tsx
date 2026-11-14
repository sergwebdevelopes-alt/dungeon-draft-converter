import { useEffect, useRef } from 'react';
import { NavigationType, useLocation, useNavigationType } from 'react-router';
import { useOpenedMapWindow } from '@/features/gallery/index.ts';
import { focusMain } from './layout/main-content.ts';

function PageChange() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();
  const mapWindow = useOpenedMapWindow() !== null;
  const lastPathname = useRef(pathname);

  useEffect(() => {
    const newPage = lastPathname.current !== pathname;
    lastPathname.current = pathname;
    if (navigationType === NavigationType.Pop || mapWindow) {
      return;
    }

    if (newPage) {
      focusMain({ preventScroll: true });
    }

    const target = hash ? document.getElementById(hash.slice(1)) : null;
    if (target) {
      target.scrollIntoView();
      return;
    }

    window.scrollTo(0, 0);
  }, [pathname, hash, navigationType, mapWindow]);

  return null;
}

export { PageChange };
