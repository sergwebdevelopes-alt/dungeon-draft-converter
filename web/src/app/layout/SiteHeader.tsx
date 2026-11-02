import { Link, NavLink } from 'react-router';
import logoUrl from '../../assets/logo.webp';
import type { SiteConfig } from '../../shared/config/site.ts';
import { ExternalLink } from '../../shared/ui/ExternalLink.tsx';

function SiteHeader({ site }: { site: SiteConfig }) {
  return (
    <header className="border-b border-line bg-sunken">
      <div className="mx-auto flex max-w-7xl items-center gap-4 py-3 pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] sm:px-6 lg:px-8">
        <Link to="/" className="flex min-w-0 items-center gap-3 rounded-lg">
          <img
            src={logoUrl}
            alt=""
            width={44}
            height={44}
            className="size-10 shrink-0 sm:size-11"
          />
          <span className="hidden min-w-0 flex-col min-[480px]:flex">
            <span className="truncate font-display text-lg font-bold tracking-wide sm:text-xl">
              {site.name}
            </span>
            {site.tagline && (
              <span className="text-xs tracking-[0.12em] text-muted uppercase">
                {site.tagline}
              </span>
            )}
          </span>
        </Link>

        <nav aria-label="Site" className="ml-auto">
          <ul className="flex items-center gap-4 sm:gap-6">
            {site.nav.map((link) => (
              <li key={link.href}>
                <NavLink
                  to={link.href}
                  className="inline-flex min-h-11 items-center border-b-2 border-transparent text-muted hover:text-text aria-[current=page]:border-gold aria-[current=page]:text-text"
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <ExternalLink
          href={site.links.patreon}
          className="inline-flex min-h-11 shrink-0 items-center rounded-lg border border-gold px-4 font-bold text-gold hover:bg-gold hover:text-on-gold"
        >
          Patreon
        </ExternalLink>
      </div>
    </header>
  );
}

export { SiteHeader };
