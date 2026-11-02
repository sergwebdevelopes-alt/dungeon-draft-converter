import { Link, NavLink } from 'react-router';
import logoUrl from '../../assets/logo.webp';
import type { SiteConfig } from '../../shared/config/site.ts';
import { Container } from '../../shared/ui/Container.tsx';
import { ThemeToggle, useTheme } from '../../shared/theme/index.ts';
import { ExternalLink } from '../../shared/ui/ExternalLink.tsx';

function SiteHeader({ site }: { site: SiteConfig }) {
  const { theme, toggle } = useTheme();

  return (
    <header className="sticky top-0 z-30 h-[calc(var(--header-height)+env(safe-area-inset-top))] border-b border-line/60 bg-bg/75 pt-[env(safe-area-inset-top)] backdrop-blur-xl backdrop-saturate-150">
      <Container className="flex h-full items-center gap-2 sm:gap-4">
        <Link to="/" className="flex min-w-0 items-center gap-3 rounded-lg">
          <img
            src={logoUrl}
            alt=""
            width={40}
            height={40}
            className="size-9 shrink-0 sm:size-10"
          />
          <span className="hidden min-w-0 flex-col min-[480px]:flex">
            <span className="truncate font-display text-lg font-bold tracking-wide">
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
          <ul className="flex items-center gap-1 sm:gap-2">
            {site.nav.map((link) => (
              <li key={link.href}>
                <NavLink
                  to={link.href}
                  className="inline-flex min-h-11 items-center rounded-full px-3 text-[15px] text-muted transition-colors hover:text-text aria-[current=page]:bg-surface aria-[current=page]:text-text"
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <ThemeToggle theme={theme} onToggle={toggle} />

        <ExternalLink
          href={site.links.patreon}
          className="hidden min-h-10 shrink-0 items-center rounded-full bg-gold px-4 text-[15px] font-bold text-on-gold transition hover:brightness-105 sm:inline-flex"
        >
          Patreon
        </ExternalLink>
      </Container>
    </header>
  );
}

export { SiteHeader };
