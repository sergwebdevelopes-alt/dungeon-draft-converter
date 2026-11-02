import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { SITE, type SiteConfig } from '../../../shared/config/site.ts';
import type { GalleryApi, MapEntry } from '../../gallery/index.ts';
import { HomePage } from './HomePage.tsx';

function entry(slug: string, title: string, x = 30, y = 20): MapEntry {
  return {
    slug,
    title,
    subtitle: 'Battlemap',
    squares: { x, y },
    tags: ['Interior'],
    patreonUrl: `https://www.patreon.com/LairofArtificer/posts/${slug}`,
  };
}

const MAPS = [
  entry('library', 'Submerged Library', 56, 73),
  entry('portal', 'Yawning Portal', 40, 40),
  entry('cavern', 'Frozen Cavern', 40, 30),
  entry('brothel', 'Elite Brothel'),
  entry('field', 'Field of Triumph'),
  entry('shrine', 'Shrine of Shar'),
];

const SITE_WITH_PLANS: SiteConfig = {
  ...SITE,
  membership: {
    plans: [
      { ...SITE.membership.plans[0], id: 'coffee' },
      {
        id: 'hero',
        name: 'Hero',
        price: { cents: 1000, currency: 'USD', period: 'month' },
        description: 'Everything.',
        perks: ['All maps'],
        joinUrl: 'https://www.patreon.com/checkout/LairofArtificer?rid=2',
      },
    ],
  },
};

function api(maps: MapEntry[] | null = MAPS): GalleryApi {
  return {
    fetchMaps: () =>
      maps ? Promise.resolve(maps) : new Promise<MapEntry[]>(() => undefined),
    prefetchMaps: () => Promise.resolve(),
  };
}

async function renderHome(fake = api()) {
  render(
    <MemoryRouter>
      <HomePage api={fake} site={SITE_WITH_PLANS} />
    </MemoryRouter>,
  );
  await screen.findByRole('heading', {
    name: 'Battle maps for epic adventures',
  });
}

describe('HomePage', () => {
  it('shows the hero with links to the maps and to membership', async () => {
    await renderHome();

    expect(
      screen.getByRole('link', { name: 'Browse the maps' }),
    ).toHaveAttribute('href', '/maps');
    expect(
      screen.getByRole('link', { name: 'Become a member' }),
    ).toHaveAttribute('href', '#membership');
  });

  it('lets the visitor pick a backdrop map', async () => {
    await renderHome();

    const picker = await screen.findByRole('group', { name: 'Backdrop maps' });
    const buttons = within(picker).getAllByRole('button');
    expect(buttons).toHaveLength(5);
    expect(buttons[0]).toHaveAttribute('aria-current', 'true');

    await userEvent.click(
      within(picker).getByRole('button', { name: 'Show Frozen Cavern' }),
    );

    expect(
      within(picker).getByRole('button', { name: 'Show Frozen Cavern' }),
    ).toHaveAttribute('aria-current', 'true');
    expect(buttons[0]).toHaveAttribute('aria-current', 'false');
  });

  it('links the latest maps straight to their gallery modal', async () => {
    await renderHome();

    const latest = within(screen.getByRole('region', { name: 'Latest maps' }));
    const links = latest
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href')?.includes('?map='));
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/maps?map=library',
      '/maps?map=portal',
      '/maps?map=cavern',
      '/maps?map=brothel',
    ]);
    expect(
      latest.getByRole('link', { name: 'See all 6 maps' }),
    ).toHaveAttribute('href', '/maps');
  });

  it('shows the converter with a landscape map', async () => {
    await renderHome();

    const teaser = within(
      screen.getByRole('region', {
        name: 'Your Dungeondraft maps, ready for any table',
      }),
    );
    expect(
      teaser.getByRole('img', {
        name: 'Frozen Cavern, shown without and with a grid',
      }),
    ).toBeInTheDocument();
    expect(
      teaser.getByRole('link', { name: 'Open the converter' }),
    ).toHaveAttribute('href', '/converter');
  });

  it('lists every membership plan from the site config', async () => {
    await renderHome();

    const membership = within(
      screen.getByRole('region', { name: 'Join the Lair of Artificer' }),
    );
    expect(
      membership
        .getAllByRole('article')
        .map((plan) => plan.getAttribute('aria-labelledby')),
    ).toEqual(['plan-coffee', 'plan-hero']);
  });

  it('still shows the hero and membership while maps load', async () => {
    await renderHome(api(null));

    expect(screen.queryByRole('group', { name: 'Backdrop maps' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Latest maps' })).toBeNull();
    expect(
      screen.getByRole('region', { name: 'Join the Lair of Artificer' }),
    ).toBeInTheDocument();
  });
});
