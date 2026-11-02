import type { SiteConfig } from '../../shared/config/site.ts';
import { ExternalLink } from '../../shared/ui/ExternalLink.tsx';

interface SiteFooterProps {
  site: SiteConfig;
  year?: number;
}

function SiteFooter({
  site,
  year = new Date().getFullYear(),
}: SiteFooterProps) {
  return (
    <footer className="border-t border-line bg-sunken">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 py-5 pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] text-sm text-muted sm:px-6 lg:px-8">
        <span>
          © {year} {site.name}
        </span>
        <ExternalLink
          href={site.links.patreon}
          className="underline-offset-4 hover:text-gold hover:underline"
        >
          Support on Patreon
        </ExternalLink>
      </div>
    </footer>
  );
}

export { SiteFooter };
