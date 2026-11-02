import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SITE } from '../shared/config/site.ts';
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
          Response.json(url === '/maps/catalog.json' ? { maps: [] } : CONFIG),
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
      screen.getByRole('heading', { name: 'Join the Lair' }),
    ).toBeInTheDocument();
  });

  it('shows the converter at /converter', async () => {
    renderAt('/converter');

    expect(
      await screen.findByRole('heading', { name: 'Dungeondraft Converter' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('checkbox', { name: /JPG · 70 px/ }),
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
    expect(document.title).toBe('Maps · Lair of Artificer');
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
    expect(document.title).toBe('Converter · Lair of Artificer');
  });
});
