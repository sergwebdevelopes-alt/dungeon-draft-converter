import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import type { GalleryApi, MapEntry } from '@/features/gallery/index.ts';
import { MapPage } from './MapPage.tsx';

function entry(slug: string, title: string): MapEntry {
  return {
    slug,
    path: `/maps/curse-of-strahd/${slug}`,
    title,
    subtitle: 'Curse of Strahd',
    description: `<p>About ${title}.</p>`,
    tags: ['Curse of Strahd'],
    squares: { x: 20, y: 30 },
    width: 2000,
    height: 3000,
    patreonUrl: `https://www.patreon.com/posts/${slug}`,
    images: {
      card: `/maps/1/${slug}/card.webp`,
      view: `/maps/1/${slug}/view.webp`,
      backdrop: `/maps/1/${slug}/backdrop.webp`,
    },
  };
}

const CASTLE = entry('castle', 'Castle Ravenloft');
const OTHERS = ['Inn', 'Gate', 'Church', 'Tavern', 'Mill'].map((title) =>
  entry(title.toLowerCase(), title),
);

interface Asked {
  maps: string[];
  pages: object[];
}

function fakeApi(collection: MapEntry[] = [CASTLE, ...OTHERS]) {
  const asked: Asked = { maps: [], pages: [] };
  const api: GalleryApi = {
    fetchMap(slug) {
      asked.maps.push(slug);
      return Promise.resolve(slug === CASTLE.slug ? CASTLE : null);
    },
    fetchPage(request) {
      asked.pages.push(request);
      return Promise.resolve({
        maps: collection.slice(0, request.limit),
        total: collection.length,
        tags: ['Curse of Strahd'],
        collections: [],
      });
    },
    fetchHighlights: () => Promise.resolve([]),
    prefetchFirstPage: () => Promise.resolve(),
  };

  return { api, asked };
}

function Address() {
  const location = useLocation();

  return (
    <output data-testid="address">
      {location.pathname}
      {location.state ? ' with a window' : ''}
    </output>
  );
}

function renderPage(slug: string, api: GalleryApi) {
  render(
    <MemoryRouter initialEntries={[`/maps/curse-of-strahd/${slug}`]}>
      <Routes>
        <Route
          path="/maps/:collection/:map"
          element={<MapPage api={api} notFound={<p>No such page</p>} />}
        />
        <Route path="/maps/:collection?" element={<p>The gallery</p>} />
      </Routes>
      <Address />
    </MemoryRouter>,
  );
}

async function renderCastle(api = fakeApi().api) {
  renderPage('castle', api);
  await screen.findByRole('heading', { level: 1, name: 'Castle Ravenloft' });
}

describe('MapPage', () => {
  afterEach(() => {
    document.title = '';
  });

  it('shows the map with its name as the page heading, its text and the way to get it', async () => {
    const { api, asked } = fakeApi();
    await renderCastle(api);

    expect(asked.maps).toEqual(['castle']);
    expect(screen.getByText('About Castle Ravenloft.')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Castle Ravenloft, Curse of Strahd' }),
    ).toHaveAttribute('src', '/maps/1/castle/view.webp');
    expect(
      screen.getByRole('link', { name: 'Get it on Patreon' }),
    ).toHaveAttribute('href', 'https://www.patreon.com/posts/castle');
    expect(document.title).toBe(
      'Castle Ravenloft Battle Map · Curse of Strahd · Lair of Artificer',
    );
  });

  it('is a page, not a window: no dialog, no close button, and its text scrolls with the page', async () => {
    await renderCastle();

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
    const details = screen
      .getByRole('heading', { level: 1 })
      .closest('div.grid')!.parentElement!.parentElement!;
    expect(details.className).not.toContain('overflow-y-auto');
  });

  it('lets the page scroll under the pointer and zooms only with the Ctrl key or a pinch', async () => {
    await renderCastle();
    const stage = screen.getByTestId('swipe-track').querySelector('img')!;

    expect(fireEvent.wheel(stage, { deltaY: -300 })).toBe(true);
    expect(fireEvent.wheel(stage, { deltaY: -300, ctrlKey: true })).toBe(false);
  });

  it('leads back to the gallery and to the collection', async () => {
    await renderCastle();

    const crumbs = within(
      screen.getByRole('navigation', { name: 'Breadcrumb' }),
    );
    expect(crumbs.getByRole('link', { name: 'Maps' })).toHaveAttribute(
      'href',
      '/maps',
    );
    expect(
      crumbs.getByRole('link', { name: 'Curse of Strahd' }),
    ).toHaveAttribute('href', '/maps/curse-of-strahd');
    expect(crumbs.getByText('Castle Ravenloft')).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('offers four more maps of the collection, asking the server for five', async () => {
    const { api, asked } = fakeApi();
    await renderCastle(api);

    const more = within(
      await screen.findByRole('region', { name: 'More from Curse of Strahd' }),
    );
    await waitFor(() =>
      expect(
        more
          .getAllByRole('listitem')
          .map((item) => within(item).getByRole('link').getAttribute('href')),
      ).toEqual([
        '/maps/curse-of-strahd/inn',
        '/maps/curse-of-strahd/gate',
        '/maps/curse-of-strahd/church',
        '/maps/curse-of-strahd/tavern',
      ]),
    );
    expect(asked.pages).toEqual([
      { tag: 'Curse of Strahd', offset: 0, limit: 5 },
    ]);
    expect(more.getByRole('link', { name: /See all/ })).toHaveAttribute(
      'href',
      '/maps/curse-of-strahd',
    );
  });

  it('opens another map from that list as its own page, not as a window', async () => {
    await renderCastle();
    const more = within(
      await screen.findByRole('region', { name: 'More from Curse of Strahd' }),
    );
    const inn = await more.findByRole('link', { name: /Inn/ });

    fireEvent.click(inn);

    expect(screen.getByTestId('address')).toHaveTextContent(
      /^\/maps\/curse-of-strahd\/inn$/,
    );
  });

  it('shows no list when the collection has no other map', async () => {
    const { api } = fakeApi([CASTLE]);
    await renderCastle(api);

    await waitFor(() =>
      expect(screen.queryByRole('region', { name: /More from/ })).toBeNull(),
    );
  });

  it('shows the not-found page for a map that does not exist', async () => {
    renderPage('nope', fakeApi().api);

    expect(await screen.findByText('No such page')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
  });
});
