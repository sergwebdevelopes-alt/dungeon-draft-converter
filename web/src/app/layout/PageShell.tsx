import { Suspense } from 'react';
import { Outlet } from 'react-router';
import type { SiteConfig } from '../../shared/config/site.ts';
import { MotionProvider } from '../../shared/ui/motion/index.ts';
import { MAIN_ID } from './main-content.ts';
import { SiteFooter } from './SiteFooter.tsx';
import { SiteHeader } from './SiteHeader.tsx';
import { SkipLink } from './SkipLink.tsx';

function PageLoading() {
  return (
    <div
      role="status"
      aria-label="Loading page"
      className="mx-auto mt-10 h-1 w-24 rounded-full bg-line motion-safe:animate-pulse"
    />
  );
}

function PageShell({ site }: { site: SiteConfig }) {
  return (
    <MotionProvider>
      <div className="flex min-h-screen flex-col">
        <SkipLink />
        <SiteHeader site={site} />
        <main id={MAIN_ID} tabIndex={-1} className="flex-1 outline-none">
          <Suspense fallback={<PageLoading />}>
            <Outlet />
          </Suspense>
        </main>
        <SiteFooter site={site} />
      </div>
    </MotionProvider>
  );
}

export { PageShell };
