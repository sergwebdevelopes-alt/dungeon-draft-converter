import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { lazy } from 'react';
import { describe, expect, it } from 'vitest';
import type { SiteConfig } from '@/shared/config/site.ts';
import { PageShell } from './PageShell.tsx';

const SITE: SiteConfig = {
  name: 'Test Lair',
  tagline: 'Maps and tools',
  nav: [
    { label: 'Home', href: '/' },
    { label: 'Maps', href: '/maps' },
  ],
  links: { patreon: 'https://example.com/patreon' },
  membership: { plans: [] },
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

  it('lets keyboard users skip the header straight to the page', async () => {
    renderShell('/maps');

    await userEvent.tab();
    const skip = screen.getByRole('link', { name: 'Skip to content' });
    expect(skip).toHaveFocus();

    await userEvent.keyboard('{Enter}');

    expect(screen.getByRole('main')).toHaveFocus();
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
      within(screen.getByRole('banner')).getByRole('link', { name: 'Patreon' }),
      within(screen.getByRole('contentinfo')).getByRole('link', {
        name: 'Patreon',
      }),
    ];
    for (const link of links) {
      expect(link).toHaveAttribute('href', 'https://example.com/patreon');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });

  it('has a theme switch in the header', () => {
    renderShell();

    expect(
      within(screen.getByRole('banner')).getByRole('button', {
        name: /Switch to (light|dark) theme/,
      }),
    ).toBeInTheDocument();
  });

  it('draws what it is given over the page, outside the main content', () => {
    render(
      <MemoryRouter>
        <Routes>
          <Route
            element={<PageShell site={SITE} overlay={<p>A map window</p>} />}
          >
            <Route index element={<p>Home content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    const overlay = screen.getByText('A map window');
    expect(screen.getByRole('main')).not.toContainElement(overlay);
    expect(screen.getByRole('main')).toHaveTextContent('Home content');
  });

  it('says a page is loading, but shows the mark only when loading takes a while', () => {
    const Slow = lazy(() => new Promise<never>(() => undefined));
    render(
      <MemoryRouter>
        <Routes>
          <Route element={<PageShell site={SITE} />}>
            <Route index element={<Slow />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    const loading = within(screen.getByRole('main')).getByRole('status', {
      name: 'Loading page',
    });
    expect(loading).toHaveClass(
      'motion-safe:opacity-0',
      'motion-safe:[animation-delay:600ms]',
    );
  });
});
