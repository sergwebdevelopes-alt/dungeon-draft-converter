import { Link } from 'react-router';
import logoUrl from '../../assets/logo.webp';
import type { SiteConfig } from '../../shared/config/site.ts';
import { Container } from '../../shared/ui/Container.tsx';
import { ExternalLink } from '../../shared/ui/ExternalLink.tsx';

interface SiteFooterProps {
  site: SiteConfig;
  year?: number;
}

const FOOTER_LINK = 'text-muted transition-colors hover:text-text';

function SiteFooter({
  site,
  year = new Date().getFullYear(),
}: SiteFooterProps) {
  return (
    <footer className="border-t border-line/60 pb-[env(safe-area-inset-bottom)]">
      <Container className="grid gap-8 py-10 sm:grid-cols-[1fr_auto_auto] sm:gap-16">
        <div className="grid content-start gap-3">
          <Link to="/" className="flex w-fit items-center gap-3">
            <img
              src={logoUrl}
              alt=""
              width={36}
              height={36}
              className="size-9"
            />
            <span className="font-display text-lg font-bold tracking-wide">
              {site.name}
            </span>
          </Link>
          <p className="max-w-xs text-sm text-muted">
            Battle maps for your epic adventures, and a free converter for
            Dungeondraft exports.
          </p>
        </div>

        <nav aria-label="Footer" className="grid content-start gap-2 text-sm">
          {site.nav.map((link) => (
            <Link key={link.href} to={link.href} className={FOOTER_LINK}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="grid content-start gap-2 text-sm">
          <ExternalLink href={site.links.patreon} className={FOOTER_LINK}>
            Support on Patreon
          </ExternalLink>
          {site.links.twitter && (
            <ExternalLink href={site.links.twitter} className={FOOTER_LINK}>
              X (Twitter)
            </ExternalLink>
          )}
        </div>
      </Container>

      <Container className="border-t border-line/60 py-5 text-sm text-muted">
        © {year} {site.name}
      </Container>
    </footer>
  );
}

export { SiteFooter };
