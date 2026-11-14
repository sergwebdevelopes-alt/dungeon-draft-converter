import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { SITE, type SiteConfig } from '@/shared/config/site.ts';
import type { GalleryApi, MapEntry } from '@/features/gallery/index.ts';
import { HomePage } from './HomePage.tsx';

function entry(slug: string, title: string, x = 30, y = 20): MapEntry {
  return {
    slug,
    title,
    subtitle: 'Battlemap',
    squares: { x, y },
    tags: ['Interior'],
    width: x * 100,
    height: y * 100,
    patreonUrl: `https://www.patreon.com/LairofArtificer/posts/${slug}`,
    images: {
      card: `/maps/1/${slug}/card.webp`,
      view: `/maps/1/${slug}/view.webp`,
      backdrop: `/maps/1/${slug}/backdrop.webp`,
    },
  };
}

const UNSIZED_LANDSCAPE: MapEntry = {
  ...entry('falls', 'Tser Falls', 60, 40),
  squares: undefined,
};

const MAPS = [
  entry('library', 'Submerged Library', 56, 73),
  UNSIZED_LANDSCAPE,
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

const HIGHLIGHTS = [
  entry('library', 'Submerged Library', 56, 73),
  entry('shrine', 'Shrine of Shar'),
  entry('field', 'Field of Triumph'),
  entry('brothel', 'Elite Brothel'),
];

function api(
  maps: MapEntry[] | null = MAPS,
  total = maps?.length ?? 0,
  highlights: MapEntry[] = HIGHLIGHTS,
): GalleryApi {
  return {
    fetchPage: () =>
      maps
        ? Promise.resolve({ maps, total, tags: [] })
        : new Promise(() => undefined),
    fetchMap: () => Promise.resolve(null),
    fetchHighlights: () =>
      maps ? Promise.resolve(highlights) : new Promise(() => undefined),
    prefetchFirstPage: () => Promise.resolve(),
  };
}

async function renderHome(fake = api(), site = SITE_WITH_PLANS) {
  const view = render(
    <MemoryRouter>
      <HomePage api={fake} site={site} />
    </MemoryRouter>,
  );
  await screen.findByRole('heading', {
    name: 'Battle maps for epic adventures',
  });

  return view;
}

describe('HomePage', () => {
  it('shows the hero with links to the maps and to membership', async () => {
    await renderHome();

    expect(
      screen.getByRole('link', { name: 'Browse the maps' }),
    ).toHaveAttribute('href', '/maps');
    expect(
      screen.getByRole('link', { name: 'Become a member' }),
    ).toHaveAttribute('href', SITE.membership.plans[0].joinUrl);
  });

  it('sends new members to the featured plan, or to the first one', async () => {
    const [coffee, hero] = SITE_WITH_PLANS.membership.plans;
    const { unmount } = await renderHome(api(), {
      ...SITE,
      membership: {
        plans: [
          { ...coffee, featured: false },
          { ...hero, featured: true },
        ],
      },
    });
    expect(
      screen.getByRole('link', { name: 'Become a member' }),
    ).toHaveAttribute('href', hero.joinUrl);
    unmount();

    await renderHome(api(), {
      ...SITE,
      membership: { plans: [hero, { ...coffee, featured: false }] },
    });
    expect(
      screen.getByRole('link', { name: 'Become a member' }),
    ).toHaveAttribute('href', hero.joinUrl);
  });

  it('sends new members to the Patreon page when there are no plans', async () => {
    await renderHome(api(), { ...SITE, membership: { plans: [] } });

    expect(
      screen.getByRole('link', { name: 'Become a member' }),
    ).toHaveAttribute('href', SITE.links.patreon);
  });

  it('puts membership first in the hero, as the main button', async () => {
    await renderHome();

    const member = screen.getByRole('link', { name: 'Become a member' });
    const browse = screen.getByRole('link', { name: 'Browse the maps' });
    expect(
      member.compareDocumentPosition(browse) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(member).toHaveClass('bg-gold');
    expect(browse).not.toHaveClass('bg-gold');
  });

  it('lets the visitor pick a backdrop map', async () => {
    await renderHome();

    const picker = await screen.findByRole('group', { name: 'Backdrop maps' });
    const buttons = within(picker).getAllByRole('button');
    expect(buttons).toHaveLength(5);
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(
      within(picker).getByRole('button', { name: 'Show Frozen Cavern' }),
    );

    expect(
      within(picker).getByRole('button', { name: 'Show Frozen Cavern' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'false');
  });

  it('links the newest map of each collection straight to its gallery modal', async () => {
    await renderHome();

    const latest = within(
      await screen.findByRole('region', { name: 'Latest maps' }),
    );
    const links = latest
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href')?.includes('?map='));
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/maps?map=library',
      '/maps?map=shrine',
      '/maps?map=field',
      '/maps?map=brothel',
    ]);
    expect(
      latest.getByRole('link', { name: 'See all 7 maps' }),
    ).toHaveAttribute('href', '/maps');
  });

  it('counts every map on the server, not just the first page', async () => {
    await renderHome(api(MAPS, 47));

    expect(
      screen.getByRole('link', { name: 'See all 47 maps' }),
    ).toHaveAttribute('href', '/maps');
  });

  it('shows the converter block with a link to the converter', async () => {
    await renderHome();

    const teaser = within(
      screen.getByRole('region', { name: /Up to 10 levels/ }),
    );
    expect(
      teaser.getByRole('img', {
        name: 'Castle Ravenloft, 8 levels merged into one map',
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
