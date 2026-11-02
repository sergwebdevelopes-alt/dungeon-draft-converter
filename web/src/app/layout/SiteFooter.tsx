import { Link } from 'react-router';
import logoUrl from '../../assets/logo.webp';
import type { SiteConfig } from '../../shared/config/site.ts';
import { Container } from '../../shared/ui/Container.tsx';
import { ExternalLink } from '../../shared/ui/ExternalLink.tsx';

const FOOTER_LINK = 'text-muted transition-colors hover:text-text';

function SiteFooter({ site }: { site: SiteConfig }) {
  return (
    <footer className="border-t border-line/60 pb-[env(safe-area-inset-bottom)]">
      <Container className="flex flex-wrap items-center gap-x-8 gap-y-4 py-6 text-sm">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={logoUrl} alt="" width={28} height={28} className="size-7" />
          <span className="font-display font-bold tracking-wide">
            {site.name}
          </span>
        </Link>

        <nav
          aria-label="Footer"
          className="flex flex-wrap gap-x-6 gap-y-2 sm:ml-auto"
        >
          {site.nav.map((link) => (
            <Link key={link.href} to={link.href} className={FOOTER_LINK}>
              {link.label}
            </Link>
          ))}
          <ExternalLink href={site.links.patreon} className={FOOTER_LINK}>
            Patreon
          </ExternalLink>
          {site.links.twitter && (
            <ExternalLink href={site.links.twitter} className={FOOTER_LINK}>
              X (Twitter)
            </ExternalLink>
          )}
        </nav>
      </Container>
    </footer>
  );
}

export { SiteFooter };
