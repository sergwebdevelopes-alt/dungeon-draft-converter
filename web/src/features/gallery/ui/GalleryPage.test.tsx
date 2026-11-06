import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router';
import { describe, expect, it } from 'vitest';
import type { MapsResponse } from '../../../../../src/contracts/gallery-api.ts';
import type { GalleryApi } from '../api.ts';
import type { MapEntry } from '../model/catalog.ts';
import type { PageRequest } from '../model/map-pages.ts';
import { GalleryPage } from './GalleryPage.tsx';

function entry(slug: string, title: string, tags: MapEntry['tags']): MapEntry {
  return {
    slug,
    title,
    subtitle: 'Ground floor',
    squares: { x: 20, y: 30 },
    tags,
    width: 2000,
    height: 3000,
    patreonUrl: `https://www.patreon.com/LairofArtificer/posts/${slug}`,
    images: {
      card: `/maps/1/${slug}/card.webp`,
      view: `/maps/1/${slug}/view.webp`,
      backdrop: `/maps/1/${slug}/backdrop.webp`,
    },
  };
}

const UNSIZED: MapEntry = {
  ...entry('crypt', 'Old Crypt', ['Underground']),
  squares: undefined,
  subtitle: undefined,
};

const DESCRIBED: MapEntry = {
  ...entry('inn', 'Blue Inn', ['Interior']),
  description:
    '<p>A <strong>safe haven</strong> in Vallaki.</p><ul><li>Three floors</li><li>VTT files</li></ul>',
};

const MAPS = [entry('cave', 'Ice Cave', ['Underground']), DESCRIBED, UNSIZED];

function many(count: number): MapEntry[] {
  return Array.from({ length: count }, (_, i) =>
    entry(`map-${i + 1}`, `Map ${i + 1}`, ['Underground']),
  );
}

let navigateBack: () => void = () => undefined;

function Probe() {
  const location = useLocation();
  const navigate = useNavigate();
  navigateBack = () => void navigate(-1);

  return (
    <output data-testid="location">
      {location.pathname + location.search}
    </output>
  );
}

interface FakeServer {
  api: GalleryApi;
  requests: PageRequest[];
  linked: string[];
}

function pageOf(maps: MapEntry[], { tag, offset, limit }: PageRequest) {
  const matching = tag ? maps.filter((map) => map.tags.includes(tag)) : maps;

  return {
    maps: matching.slice(offset, offset + limit),
    total: matching.length,
    tags: [...new Set(maps.flatMap((map) => map.tags))],
  };
}

function fakeServer(
  maps: MapEntry[] = MAPS,
  answer: (
    request: PageRequest,
    page: MapsResponse,
  ) => Promise<MapsResponse> = (_request, page) => Promise.resolve(page),
): FakeServer {
  const requests: PageRequest[] = [];
  const linked: string[] = [];

  return {
    requests,
    linked,
    api: {
      fetchPage(request) {
        requests.push(request);
        return answer(request, pageOf(maps, request));
      },
      fetchMap(slug) {
        linked.push(slug);
        return Promise.resolve(maps.find((map) => map.slug === slug) ?? null);
      },
      prefetchFirstPage: () => Promise.resolve(),
    },
  };
}

function fakeApi(maps: MapEntry[] | Error = MAPS): GalleryApi {
  if (maps instanceof Error) {
    return fakeServer([], () => Promise.reject(maps)).api;
  }

  return fakeServer(maps).api;
}

function listedMaps() {
  return screen.getAllByRole('listitem');
}

function heading() {
  return within(dialog()!).getByRole('heading').textContent;
}

function mapCard(number: number) {
  return screen.getByRole('button', {
    name: new RegExp(`^Map ${number}(?!\\d)`),
  });
}

async function renderGallery(path = '/maps', api = fakeApi()) {
  render(
    <MemoryRouter initialEntries={['/', path]} initialIndex={1}>
      <Routes>
        <Route
          path="/maps"
          element={
            <>
              <GalleryPage api={api} />
              <Probe />
            </>
          }
        />
        <Route path="/" element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByRole('group', { name: 'Filter maps' });
}

function cardImage(title: string) {
  return card(title).querySelector('img');
}

async function renderGalleryError() {
  render(
    <MemoryRouter initialEntries={['/maps']}>
      <GalleryPage api={fakeApi(new Error('down'))} />
    </MemoryRouter>,
  );
  await screen.findByRole('alert');
}

function location() {
  return screen.getByTestId('location').textContent;
}

function dialog() {
  return screen.queryByRole('dialog');
}

function card(title: string) {
  return screen.getByRole('button', { name: new RegExp(title) });
}

describe('GalleryPage', () => {
  it('shows every map and filters by tag', async () => {
    await renderGallery();

    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(cardImage('Ice Cave')).toHaveAttribute(
      'src',
      '/maps/1/cave/card.webp',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Underground' }));
    await waitFor(() =>
      expect(screen.getAllByRole('listitem')).toHaveLength(2),
    );
    expect(screen.queryByText('Blue Inn')).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'All maps' }));
    await waitFor(() =>
      expect(screen.getAllByRole('listitem')).toHaveLength(3),
    );
  });

  it('opens a map in a modal and keeps the user on the gallery', async () => {
    await renderGallery();

    await userEvent.click(card('Blue Inn'));

    const modal = dialog();
    expect(modal).toHaveAttribute('open');
    expect(
      within(modal!).getByRole('heading', { name: 'Blue Inn' }),
    ).toBeInTheDocument();
    expect(
      within(modal!).getByText('Ground floor · 20 × 30 squares'),
    ).toBeInTheDocument();
    expect(
      within(modal!).getByRole('link', { name: 'Get it on Patreon' }),
    ).toHaveAttribute(
      'href',
      'https://www.patreon.com/LairofArtificer/posts/inn',
    );
    expect(location()).toBe('/maps?map=inn');
  });

  it('closes with Escape and returns focus to the card', async () => {
    await renderGallery();
    await userEvent.click(card('Blue Inn'));
    within(dialog()!).getByRole('button', { name: 'Close' }).focus();

    fireEvent(dialog()!, new Event('cancel', { cancelable: true }));

    await waitFor(() => expect(dialog()).toBeNull());
    expect(location()).toBe('/maps');
    await waitFor(() => expect(card('Blue Inn')).toHaveFocus());
  });

  it('keeps the page from scrolling while a map is open', async () => {
    await renderGallery();
    const root = document.documentElement;

    await userEvent.click(card('Blue Inn'));

    expect(root.style.overflow).toBe('hidden');

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(dialog()).toBeNull());

    expect(root.style.overflow).toBe('');
  });

  it('closes when the user goes back', async () => {
    await renderGallery();
    await userEvent.click(card('Ice Cave'));

    act(() => navigateBack());

    await waitFor(() => expect(dialog()).toBeNull());
    expect(location()).toBe('/maps');
  });

  it('opens the map from a shared link and closes to the gallery', async () => {
    await renderGallery('/maps?map=crypt');

    expect(
      within(dialog()!).getByRole('heading', { name: 'Old Crypt' }),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() => expect(dialog()).toBeNull());
    expect(location()).toBe('/maps');
  });

  it('shows just the gallery for an unknown map', async () => {
    await renderGallery('/maps?map=nope');

    expect(dialog()).toBeNull();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('moves between maps with the arrow keys and buttons, wrapping around', async () => {
    await renderGallery();
    await userEvent.click(card('Ice Cave'));

    await userEvent.keyboard('{ArrowRight}');
    expect(
      within(dialog()!).getByRole('heading', { name: 'Blue Inn' }),
    ).toBeInTheDocument();
    expect(within(dialog()!).getByRole('status')).toHaveTextContent(
      'Blue Inn, 2 of 3',
    );
    expect(location()).toBe('/maps?map=inn');

    await userEvent.click(screen.getByRole('button', { name: 'Previous map' }));
    await userEvent.click(screen.getByRole('button', { name: 'Previous map' }));
    expect(
      within(dialog()!).getByRole('heading', { name: 'Old Crypt' }),
    ).toBeInTheDocument();
    expect(within(dialog()!).getByText('3 of 3')).toBeInTheDocument();
  });

  it('steps only through the filtered maps', async () => {
    await renderGallery();
    await userEvent.click(screen.getByRole('button', { name: 'Underground' }));
    await waitFor(() => expect(screen.queryByText('Blue Inn')).toBeNull());
    await userEvent.click(card('Ice Cave'));

    await userEvent.click(screen.getByRole('button', { name: 'Next map' }));

    expect(
      within(dialog()!).getByRole('heading', { name: 'Old Crypt' }),
    ).toBeInTheDocument();
    expect(within(dialog()!).getByText('2 of 2')).toBeInTheDocument();
  });

  it('shows the grid version on request', async () => {
    await renderGallery('/maps?map=cave');
    const modal = dialog()!;

    expect(modal.querySelector('svg line')).toBeNull();

    await userEvent.click(
      within(modal).getByRole('button', { name: 'With grid' }),
    );

    expect(modal.querySelectorAll('svg line')).toHaveLength(21 + 31);
    expect(
      within(modal).getByRole('button', { name: 'With grid' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows the description of a map from Patreon', async () => {
    await renderGallery('/maps?map=inn');
    const description = within(dialog()!).getByRole('region', {
      name: 'Description',
    });

    expect(description).toHaveTextContent('A safe haven in Vallaki.');
    expect(within(description).getByText('safe haven').tagName).toBe('STRONG');
    expect(
      within(description)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Three floors', 'VTT files']);
  });

  it('shows no description when the post has none', async () => {
    await renderGallery('/maps?map=cave');

    expect(
      within(dialog()!).queryByRole('region', { name: 'Description' }),
    ).toBeNull();
  });

  it('shows a map without a known size without the grid choice', async () => {
    await renderGallery('/maps?map=crypt');
    const modal = dialog()!;

    expect(
      within(modal).queryByRole('button', { name: 'With grid' }),
    ).toBeNull();
    expect(within(modal).queryByText(/squares/)).toBeNull();
    expect(
      within(modal).getByRole('img', { name: 'Old Crypt' }),
    ).toHaveAttribute('src', '/maps/1/crypt/view.webp');
  });

  it('shows placeholders while loading and a message when loading fails', async () => {
    render(
      <MemoryRouter initialEntries={['/maps']}>
        <GalleryPage
          api={fakeServer(MAPS, () => new Promise(() => undefined)).api}
        />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('list', { name: 'Loading maps' }),
    ).toBeInTheDocument();
    cleanup();

    await renderGalleryError();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The maps could not be loaded.',
    );
  });

  it('invites visitors to become members', async () => {
    await renderGallery();

    expect(
      screen.getByRole('region', { name: 'Join the Lair of Artificer' }),
    ).toBeInTheDocument();
  });

  it('builds the filter from the collections the server lists', async () => {
    await renderGallery();

    const filters = within(screen.getByRole('group', { name: 'Filter maps' }));
    expect(filters.getAllByRole('button').map((b) => b.textContent)).toEqual([
      'All maps',
      'Underground',
      'Interior',
    ]);
  });

  it('keeps only the opened card as the morph target while browsing', async () => {
    await renderGallery();
    await userEvent.click(card('Ice Cave'));
    await userEvent.click(screen.getByRole('button', { name: 'Next map' }));

    expect(cardImage('Ice Cave')).toBeNull();
    expect(cardImage('Blue Inn')).not.toBeNull();
  });
  it('shows 21 maps first and 24 more each time the visitor asks', async () => {
    const server = fakeServer(many(50));
    await renderGallery('/maps', server.api);

    expect(listedMaps()).toHaveLength(21);

    await userEvent.click(
      screen.getByRole('button', { name: 'Show more maps' }),
    );
    await waitFor(() => expect(listedMaps()).toHaveLength(45));

    await userEvent.click(
      screen.getByRole('button', { name: 'Show more maps' }),
    );
    await waitFor(() => expect(listedMaps()).toHaveLength(50));

    expect(screen.queryByRole('button', { name: 'Show more maps' })).toBeNull();
    expect(server.requests).toEqual([
      { tag: null, offset: 0, limit: 21 },
      { tag: null, offset: 21, limit: 24 },
      { tag: null, offset: 45, limit: 24 },
    ]);
  });

  it('asks the server for the maps of the chosen collection', async () => {
    const server = fakeServer();
    await renderGallery('/maps', server.api);

    await userEvent.click(screen.getByRole('button', { name: 'Interior' }));
    await waitFor(() => expect(listedMaps()).toHaveLength(1));

    expect(server.requests.at(-1)).toEqual({
      tag: 'Interior',
      offset: 0,
      limit: 21,
    });
    expect(screen.getByRole('button', { name: 'Interior' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('says when more maps fail to load and lets the visitor try again', async () => {
    let failures = 1;
    const server = fakeServer(many(30), (request, page) =>
      request.offset > 0 && failures-- > 0
        ? Promise.reject(new Error('Offline.'))
        : Promise.resolve(page),
    );
    await renderGallery('/maps', server.api);

    await userEvent.click(
      screen.getByRole('button', { name: 'Show more maps' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'More maps could not be loaded.',
    );
    expect(listedMaps()).toHaveLength(21);

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(listedMaps()).toHaveLength(30));
  });

  it('counts the position in the modal from all the maps on the server', async () => {
    await renderGallery('/maps', fakeServer(many(30)).api);

    await userEvent.click(mapCard(3));

    expect(within(dialog()!).getByText('3 of 30')).toBeInTheDocument();
  });

  it('does not wrap around while maps are left to load', async () => {
    await renderGallery('/maps', fakeServer(many(30)).api);
    await userEvent.click(mapCard(1));

    await userEvent.click(screen.getByRole('button', { name: 'Previous map' }));

    expect(heading()).toBe('Map 1');
  });

  it('steps from the last loaded map into the next page once it arrives', async () => {
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const server = fakeServer(many(30), async (request, page) => {
      if (request.offset > 0) {
        await held;
      }
      return page;
    });
    await renderGallery('/maps', server.api);
    await userEvent.click(mapCard(21));

    await userEvent.click(screen.getByRole('button', { name: 'Next map' }));
    expect(heading()).toBe('Map 21');

    await act(async () => {
      release();
      await held;
    });

    await waitFor(() => expect(heading()).toBe('Map 22'));
    expect(within(dialog()!).getByText('22 of 30')).toBeInTheDocument();
    expect(location()).toBe('/maps?map=map-22');
  });

  it('opens a linked map that is not loaded yet, without a position', async () => {
    const server = fakeServer(many(30));
    await renderGallery('/maps?map=map-30', server.api);

    await waitFor(() => expect(dialog()).not.toBeNull());

    expect(heading()).toBe('Map 30');
    expect(server.linked).toEqual(['map-30']);
    expect(within(dialog()!).getByRole('status')).toHaveTextContent(/^Map 30$/);
    expect(
      within(dialog()!).queryByRole('button', { name: 'Next map' }),
    ).toBeNull();
    expect(within(dialog()!).queryByText(/of 30/)).toBeNull();
  });
});
