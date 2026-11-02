import { useEffect, useRef } from 'react';
import { NavigationType, useLocation, useNavigationType } from 'react-router';
import { focusMain } from './layout/main-content.ts';

function PageChange() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();
  const lastPathname = useRef(pathname);

  useEffect(() => {
    const newPage = lastPathname.current !== pathname;
    lastPathname.current = pathname;
    if (navigationType === NavigationType.Pop) {
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
  }, [pathname, hash, navigationType]);

  return null;
}

export { PageChange };
