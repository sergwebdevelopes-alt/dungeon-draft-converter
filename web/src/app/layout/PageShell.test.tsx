import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { SiteConfig } from '../../shared/config/site.ts';
import { PageShell } from './PageShell.tsx';

const SITE: SiteConfig = {
  name: 'Test Lair',
  tagline: 'Maps and tools',
  nav: [
    { label: 'Home', href: '/' },
    { label: 'Maps', href: '/maps' },
  ],
  links: { patreon: 'https://example.com/patreon' },
};

function renderShell(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<PageShell site={SITE} />}>
          <Route index element={<p>Home content</p>} />
          <Route path="maps" element={<p>Maps content</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('PageShell', () => {
  it('shows the site name and tagline in the header', () => {
    renderShell();

    const header = screen.getByRole('banner');
    expect(header).toHaveTextContent('Test Lair');
    expect(header).toHaveTextContent('Maps and tools');
  });

  it('renders the current page inside main', () => {
    renderShell('/maps');

    expect(screen.getByRole('main')).toHaveTextContent('Maps content');
  });

  it('marks only the current page in the nav', () => {
    renderShell('/maps');

    const nav = screen.getByRole('navigation', { name: 'Site' });
    expect(nav.querySelector('[aria-current="page"]')).toHaveTextContent(
      'Maps',
    );
    expect(nav.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
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
