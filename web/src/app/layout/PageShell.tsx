import type { ReactNode } from 'react';
import type { SiteConfig } from '../../shared/config/site.ts';
import { SiteFooter } from './SiteFooter.tsx';
import { SiteHeader } from './SiteHeader.tsx';

interface PageShellProps {
  site: SiteConfig;
  currentPath: string;
  children: ReactNode;
}

function PageShell({ site, currentPath, children }: PageShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader site={site} currentPath={currentPath} />
      <main className="mx-auto w-full max-w-7xl flex-1 pt-6 pr-[max(1rem,env(safe-area-inset-right))] pb-36 pl-[max(1rem,env(safe-area-inset-left))] sm:px-6 lg:px-8 lg:pb-8">
        {children}
      </main>
      <SiteFooter site={site} />
    </div>
  );
}

export { PageShell };
