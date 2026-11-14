import { render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SITE } from '@/shared/config/site.ts';
import { AppRoutes } from './routes.tsx';

const CONFIG = {
  presets: [{ name: 'JPG_70', ppi: 70, format: 'jpg' }],
  variants: ['NoGrid', 'Grid'],
  maxUploadBytes: 1000,
  maxTotalUploadBytes: 2000,
  maxLevels: 10,
  maxLogoBytes: 1000,
  logo: {
    size: { min: 2, max: 20, step: 1, default: 10 },
    margin: { min: 0, max: 5, step: 0.5, default: 3 },
  },
};

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes site={SITE} />
    </MemoryRouter>,
  );
}

describe('AppRoutes', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        Promise.resolve(
          Response.json(url === '/api/maps' ? { maps: [] } : CONFIG),
        ),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the home page at /', async () => {
    renderAt('/');

    expect(
      await screen.findByRole('heading', {
        name: 'Battle maps for epic adventures',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Join the Lair of Artificer' }),
    ).toBeInTheDocument();
  });

  it('shows the converter at /converter', async () => {
    renderAt('/converter');

    expect(
      await screen.findByRole('heading', { name: 'Dungeondraft Converter' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: /JPG · 70 px/ }),
    ).toBeInTheDocument();
  });

  it('opens the converter from the home page without reloading', async () => {
    renderAt('/');

    await userEvent.click(
      await screen.findByRole('link', { name: 'Open the converter' }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Dungeondraft Converter' }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('navigation', { name: 'Site' })).getByRole(
        'link',
        {
          name: 'Converter',
        },
      ),
    ).toHaveAttribute('aria-current', 'page');
  });

  it('shows the gallery at /maps', async () => {
    renderAt('/maps');

    expect(
      await screen.findByRole('heading', { name: 'Maps from the Lair' }),
    ).toBeInTheDocument();
    expect(document.title).toBe('D&D Battle Map Gallery · Lair of Artificer');
  });

  it('shows a not-found page for unknown paths', async () => {
    renderAt('/no/such/page');

    expect(
      await screen.findByRole('heading', {
        name: 'This passage leads nowhere',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Back to the home page' }),
    ).toHaveAttribute('href', '/');
  });

  it('sets the page title', async () => {
    renderAt('/converter');

    await screen.findByRole('heading', { name: 'Dungeondraft Converter' });
    expect(document.title).toBe(
      'Free dd2vtt Converter for Dungeondraft · Lair of Artificer',
    );
  });
});

const CASTLE = {
  slug: 'castle',
  path: '/maps/curse-of-strahd/castle',
  title: 'Castle Ravenloft',
  tags: ['Curse of Strahd'],
  width: 2000,
  height: 3000,
  patreonUrl: 'https://www.patreon.com/posts/castle',
  images: {
    card: '/maps/1/castle/card.webp',
    view: '/maps/1/castle/view.webp',
    backdrop: '/maps/1/castle/backdrop.webp',
  },
};

const GALLERY = {
  maps: [CASTLE],
  total: 1,
  tags: ['Curse of Strahd'],
  collections: [{ name: 'Curse of Strahd', path: '/maps/curse-of-strahd' }],
};

function answerFor(url: string): unknown {
  if (url === '/api/highlights') {
    return { maps: [CASTLE] };
  }
  if (url === '/api/maps/castle') {
    return { map: CASTLE };
  }

  return url.startsWith('/api/maps?') ? GALLERY : CONFIG;
}

function Address() {
  const location = useLocation();

  return <output data-testid="address">{location.pathname}</output>;
}

function renderSite(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes site={SITE} />
      <Address />
    </MemoryRouter>,
  );
}

describe('AppRoutes with maps', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        Promise.resolve(
          url === '/api/maps/nope'
            ? Response.json({ error: 'No map.' }, { status: 404 })
            : Response.json(answerFor(url)),
        ),
      ),
    );
    vi.stubGlobal('scrollTo', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens a map from the home page in a window over the home page', async () => {
    renderSite('/');
    const latest = within(
      await screen.findByRole('region', { name: 'Latest maps' }),
    );

    await userEvent.click(
      latest.getByRole('link', { name: /Castle Ravenloft/ }),
    );

    const window = await screen.findByRole('dialog');
    expect(
      within(window).getByRole('heading', { name: 'Castle Ravenloft' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('address')).toHaveTextContent(
      '/maps/curse-of-strahd/castle',
    );
    expect(
      screen.getByRole('heading', { name: 'Battle maps for epic adventures' }),
    ).toBeInTheDocument();
    expect(document.title).toBe(
      'Castle Ravenloft Battle Map · Curse of Strahd · Lair of Artificer',
    );

    await userEvent.click(
      within(window).getByRole('button', { name: 'Close' }),
    );

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByTestId('address')).toHaveTextContent(/^\/$/);
    expect(document.title).toBe(
      'D&D Battle Maps for Foundry VTT & Roll20 · Lair of Artificer',
    );
  });

  it('opens a map from the gallery in a window over the gallery', async () => {
    renderSite('/maps');

    const card = await screen.findByRole('link', {
      name: /Castle Ravenloft/,
    });
    expect(card).toHaveAttribute('href', '/maps/curse-of-strahd/castle');
    expect(card.querySelector('img')).not.toBeNull();

    await userEvent.click(card);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(card.querySelector('img')).toBeNull();
    expect(screen.getByTestId('address')).toHaveTextContent(
      '/maps/curse-of-strahd/castle',
    );
    expect(
      screen.getByRole('heading', { name: 'Maps from the Lair' }),
    ).toBeInTheDocument();
  });

  it('shows the page of a map to a visitor who comes by its address', async () => {
    renderSite('/maps/curse-of-strahd/castle');

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Castle Ravenloft',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(
      screen.getByRole('navigation', { name: 'Breadcrumb' }),
    ).toBeInTheDocument();
  });

  it('shows the not-found page for a map that does not exist', async () => {
    renderSite('/maps/curse-of-strahd/nope');

    expect(
      await screen.findByRole('heading', {
        name: 'This passage leads nowhere',
      }),
    ).toBeInTheDocument();
  });

  it('shows a collection at its own address, named in the heading and the tab', async () => {
    renderSite('/maps/curse-of-strahd');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Curse of Strahd' }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(document.title).toBe(
        'Curse of Strahd Battle Maps · Lair of Artificer',
      ),
    );
    expect(
      screen.getByRole('link', { name: 'Curse of Strahd' }),
    ).toHaveAttribute('aria-current', 'page');
  });
});
