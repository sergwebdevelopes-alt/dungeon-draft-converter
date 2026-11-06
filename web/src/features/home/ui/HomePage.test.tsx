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

function api(
  maps: MapEntry[] | null = MAPS,
  total = maps?.length ?? 0,
): GalleryApi {
  return {
    fetchPage: () =>
      maps
        ? Promise.resolve({ maps, total, tags: [] })
        : new Promise(() => undefined),
    fetchMap: () => Promise.resolve(null),
    prefetchFirstPage: () => Promise.resolve(),
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
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(
      within(picker).getByRole('button', { name: 'Show Frozen Cavern' }),
    );

    expect(
      within(picker).getByRole('button', { name: 'Show Frozen Cavern' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'false');
  });

  it('links the latest maps straight to their gallery modal', async () => {
    await renderHome();

    const latest = within(screen.getByRole('region', { name: 'Latest maps' }));
    const links = latest
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href')?.includes('?map='));
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/maps?map=library',
      '/maps?map=falls',
      '/maps?map=portal',
      '/maps?map=cavern',
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

  it('shows the converter with a landscape map that has a known size', async () => {
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

  it('frames a wide map at 4:3 and lays its image and grid over the whole map', async () => {
    await renderHome(api([entry('inn', 'Blue Water Inn', 62, 28), ...MAPS]));

    const image = screen.getByRole('img', {
      name: 'Blue Water Inn, shown without and with a grid',
    });
    const cover = image.parentElement;
    const frame = cover?.parentElement;
    const gridCover = frame?.querySelector('svg')?.parentElement;
    expect(frame?.style.aspectRatio).toBe(`${4 / 3} / 1`);
    expect(cover?.style.aspectRatio).toBe('6200 / 2800');
    expect(gridCover?.getAttribute('style')).toBe(cover?.getAttribute('style'));
  });

  it('moves the grid and the line with transforms only, so a big grid is not redrawn', async () => {
    await renderHome();
    const teaser = screen.getByRole('region', {
      name: 'Your Dungeondraft maps, ready for any table',
    });
    const reveal = within(teaser).getByTestId('grid-reveal');
    const grid = reveal.querySelector('svg');
    const counter = grid?.parentElement?.parentElement;
    const line = reveal.nextElementSibling;

    expect(reveal).toHaveClass('animate-wipe', 'overflow-hidden');
    expect(counter?.parentElement).toBe(reveal);
    expect(counter).toHaveClass('animate-wipe-back');
    expect(line).toHaveAttribute('aria-hidden', 'true');
    expect(line).toHaveClass('animate-wipe');
    expect(teaser.innerHTML).not.toMatch(/clip-path|animate-wipe-line/);
  });

  it('names the image formats the converter makes', async () => {
    await renderHome();

    const teaser = screen.getByRole('region', {
      name: 'Your Dungeondraft maps, ready for any table',
    });
    const formats = within(teaser).getByText('Formats');
    expect(formats.nextElementSibling).toHaveTextContent('JPG · WebP');
    expect(teaser).not.toHaveTextContent('1 inch');
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
