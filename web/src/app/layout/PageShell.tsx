import { Suspense } from 'react';
import { Outlet } from 'react-router';
import type { SiteConfig } from '../../shared/config/site.ts';
import { SiteFooter } from './SiteFooter.tsx';
import { SiteHeader } from './SiteHeader.tsx';

function PageLoading() {
  return (
    <div
      role="status"
      aria-label="Loading page"
      className="h-1 w-24 rounded-full bg-line motion-safe:animate-pulse"
    />
  );
}

function PageShell({ site }: { site: SiteConfig }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader site={site} />
      <main className="mx-auto w-full max-w-7xl flex-1 pt-6 pr-[max(1rem,env(safe-area-inset-right))] pb-36 pl-[max(1rem,env(safe-area-inset-left))] sm:px-6 lg:px-8 lg:pb-8">
        <Suspense fallback={<PageLoading />}>
          <Outlet />
        </Suspense>
      </main>
      <SiteFooter site={site} />
    </div>
  );
}

export { PageShell };
