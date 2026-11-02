import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { SiteConfig } from '../../shared/config/site.ts';
import { PageShell } from './PageShell.tsx';

const SITE: SiteConfig = {
  name: 'Test Lair',
  tagline: 'Maps and tools',
  nav: [
    { label: 'Converter', href: '/' },
    { label: 'Maps', href: '/maps' },
  ],
  links: { patreon: 'https://example.com/patreon' },
};

function renderShell(currentPath = '/') {
  return render(
    <PageShell site={SITE} currentPath={currentPath}>
      <p>Page content</p>
    </PageShell>,
  );
}

describe('PageShell', () => {
  it('shows the site name and tagline in the header', () => {
    renderShell();

    const header = screen.getByRole('banner');
    expect(header).toHaveTextContent('Test Lair');
    expect(header).toHaveTextContent('Maps and tools');
  });

  it('renders the page content inside main', () => {
    renderShell();

    expect(screen.getByRole('main')).toHaveTextContent('Page content');
  });

  it('marks the current page in the nav', () => {
    renderShell('/maps');

    expect(screen.getByRole('link', { name: 'Maps' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Converter' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('links to Patreon from the site config in a new tab', () => {
    renderShell();

    const links = [
      screen.getByRole('link', { name: 'Patreon' }),
      screen.getByRole('link', { name: 'Support on Patreon' }),
    ];
    for (const link of links) {
      expect(link).toHaveAttribute('href', 'https://example.com/patreon');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });

  it('shows the copyright year and site name in the footer', () => {
    renderShell();

    expect(screen.getByRole('contentinfo')).toHaveTextContent(
      `© ${new Date().getFullYear()} Test Lair`,
    );
  });
});
