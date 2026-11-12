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

function picture(name: string, width: number, height: number) {
  return {
    view: `/maps/1/${name}/view.webp`,
    thumb: `/maps/1/${name}/thumb.webp`,
    width,
    height,
  };
}

const CASTLE: MapEntry = {
  ...entry('castle', 'Castle', ['Underground']),
  pictures: [
    picture('castle', 2000, 3000),
    picture('castle-roof', 2000, 3000),
    picture('castle-cellar', 4000, 3000),
  ],
};

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

async function renderGallery(path = '/maps', api = fakeApi(), from = '/') {
  render(
    <MemoryRouter initialEntries={[from, path]} initialIndex={1}>
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

async function renderCastle() {
  await renderGallery('/maps?map=castle', fakeApi([CASTLE, ...MAPS]));
}

function trackImages() {
  const track = within(dialog()!).getByTestId('swipe-track');

  return [...track.querySelectorAll('img')].map((img) =>
    img.getAttribute('src'),
  );
}

function shownPicture() {
  const track = within(dialog()!).getByTestId('swipe-track');
  const shown = [...track.children].find(
    (slide) => !slide.hasAttribute('aria-hidden'),
  );

  return shown?.querySelector('img')?.getAttribute('src');
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

  it('names the tab after the open map', async () => {
    await renderGallery();
    expect(document.title).toBe('Maps · Lair of Artificer');

    await userEvent.click(card('Blue Inn'));
    await waitFor(() =>
      expect(document.title).toBe('Blue Inn · Lair of Artificer'),
    );

    fireEvent(dialog()!, new Event('cancel', { cancelable: true }));
    await waitFor(() =>
      expect(document.title).toBe('Maps · Lair of Artificer'),
    );
  });

  it('names the tab after a linked map from the first render', async () => {
    await renderGallery('/maps?map=inn');

    await waitFor(() =>
      expect(document.title).toBe('Blue Inn · Lair of Artificer'),
    );
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

  it('puts the controls over the image and the neighbouring pictures beside it in the swipe track', async () => {
    await renderCastle();
    const track = within(dialog()!).getByTestId('swipe-track');
    const imageArea = track.parentElement!;

    for (const name of ['Close', 'Previous picture', 'Next picture']) {
      const button = within(dialog()!).getByRole('button', { name });
      expect(imageArea.contains(button), name).toBe(true);
      expect(track.contains(button), name).toBe(false);
    }
    const strip = within(dialog()!).getByRole('list', {
      name: 'Pictures of this map',
    });
    expect(imageArea).toContainElement(strip);
    expect(track).not.toContainElement(strip);
    expect(trackImages()).toEqual([
      '/maps/1/castle-cellar/view.webp',
      '/maps/1/castle/view.webp',
      '/maps/1/castle-roof/view.webp',
    ]);
  });

  it('shows a map with one picture without a strip or arrows', async () => {
    await renderGallery();
    await userEvent.click(card('Ice Cave'));

    expect(trackImages()).toEqual(['/maps/1/cave/view.webp']);
    expect(
      within(dialog()!).queryByRole('list', { name: 'Pictures of this map' }),
    ).toBeNull();
    expect(
      within(dialog()!).queryByRole('button', { name: /picture/i }),
    ).toBeNull();
    expect(within(dialog()!).getByRole('status')).toHaveTextContent(
      /^Ice Cave$/,
    );

    await userEvent.keyboard('{ArrowRight}');
    expect(shownPicture()).toBe('/maps/1/cave/view.webp');
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

  it('moves between the pictures of a map with the arrow keys and buttons, going round at the ends', async () => {
    await renderCastle();

    await userEvent.keyboard('{ArrowRight}');
    expect(shownPicture()).toBe('/maps/1/castle-roof/view.webp');
    expect(within(dialog()!).getByRole('status')).toHaveTextContent(
      'Castle, picture 2 of 3',
    );
    expect(heading()).toBe('Castle');
    expect(location()).toBe('/maps?map=castle');

    await userEvent.click(
      screen.getByRole('button', { name: 'Previous picture' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Previous picture' }),
    );
    expect(shownPicture()).toBe('/maps/1/castle-cellar/view.webp');
    expect(within(dialog()!).getByRole('status')).toHaveTextContent(
      'Castle, picture 3 of 3',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Next picture' }));
    expect(shownPicture()).toBe('/maps/1/castle/view.webp');

    await userEvent.keyboard('{ArrowLeft}');
    expect(shownPicture()).toBe('/maps/1/castle-cellar/view.webp');
  });

  it('opens the picture picked in the strip and marks its thumbnail', async () => {
    await renderCastle();
    const third = screen.getByRole('button', { name: 'Picture 3 of 3' });
    expect(third.querySelector('img')).toHaveAttribute(
      'src',
      '/maps/1/castle-cellar/thumb.webp',
    );

    await userEvent.click(third);

    expect(shownPicture()).toBe('/maps/1/castle-cellar/view.webp');
    expect(third).toHaveAttribute('aria-current', 'true');
    expect(
      screen.getByRole('button', { name: 'Picture 1 of 3' }),
    ).not.toHaveAttribute('aria-current');

    await userEvent.click(
      screen.getByRole('button', { name: 'Picture 2 of 3' }),
    );

    expect(shownPicture()).toBe('/maps/1/castle-roof/view.webp');
  });

  it('starts from the first picture when the visitor goes back to another open map', async () => {
    const tower: MapEntry = {
      ...entry('tower', 'Tower', ['Underground']),
      pictures: [
        picture('tower', 2000, 3000),
        picture('tower-top', 2000, 3000),
      ],
    };
    await renderGallery(
      '/maps?map=castle',
      fakeApi([CASTLE, tower, ...MAPS]),
      '/maps?map=tower',
    );
    await userEvent.keyboard('{ArrowRight}');
    expect(shownPicture()).toBe('/maps/1/castle-roof/view.webp');

    act(() => navigateBack());

    await waitFor(() => expect(heading()).toBe('Tower'));
    expect(shownPicture()).toBe('/maps/1/tower/view.webp');
    expect(cardImage('Tower')).toBeNull();
    expect(cardImage('Castle')).not.toBeNull();
  });

  it('goes round a map with two pictures in both directions', async () => {
    const two = { ...CASTLE, pictures: CASTLE.pictures?.slice(0, 2) };
    await renderGallery('/maps?map=castle', fakeApi([two, ...MAPS]));

    const seen = [shownPicture()];
    for (const key of ['{ArrowRight}', '{ArrowRight}', '{ArrowLeft}']) {
      await userEvent.keyboard(key);
      seen.push(shownPicture());
    }

    expect(seen).toEqual([
      '/maps/1/castle/view.webp',
      '/maps/1/castle-roof/view.webp',
      '/maps/1/castle/view.webp',
      '/maps/1/castle-roof/view.webp',
    ]);
    expect(trackImages()).toEqual([
      '/maps/1/castle/view.webp',
      '/maps/1/castle-roof/view.webp',
      '/maps/1/castle/view.webp',
    ]);
  });

  it('starts from the first picture each time a map is opened', async () => {
    await renderGallery('/maps', fakeApi([CASTLE, ...MAPS]));
    await userEvent.click(card('Castle'));
    await userEvent.keyboard('{ArrowRight}');
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(dialog()).toBeNull());

    await userEvent.click(card('Castle'));

    expect(shownPicture()).toBe('/maps/1/castle/view.webp');
  });

  it('morphs from the card only until the visitor moves to another picture', async () => {
    await renderGallery('/maps', fakeApi([CASTLE, ...MAPS]));
    await userEvent.click(card('Castle'));
    const frameOfCover = () =>
      within(dialog()!)
        .getByTestId('swipe-track')
        .querySelector('img[src="/maps/1/castle/view.webp"]')!.parentElement!;

    expect(frameOfCover().className).not.toContain('bg-surface');

    await userEvent.keyboard('{ArrowRight}');
    await userEvent.keyboard('{ArrowLeft}');

    expect(shownPicture()).toBe('/maps/1/castle/view.webp');
    expect(frameOfCover().className).toContain('bg-surface');
  });

  it('says on the card how many levels a map has', async () => {
    await renderGallery('/maps', fakeApi([CASTLE, ...MAPS]));

    expect(within(card('Castle')).getByText('3 levels')).toBeInTheDocument();
    expect(within(card('Ice Cave')).queryByText(/levels/)).toBeNull();
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
    document.title = '';
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
    expect(document.title).toBe('Maps · Lair of Artificer');
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

  it('offers the grid only on the pictures it fits', async () => {
    await renderCastle();
    const modal = dialog()!;
    await userEvent.click(
      within(modal).getByRole('button', { name: 'With grid' }),
    );
    expect(modal.querySelectorAll('svg line')).toHaveLength(21 + 31);

    await userEvent.keyboard('{ArrowRight}');
    expect(modal.querySelectorAll('svg line')).toHaveLength(21 + 31);

    await userEvent.keyboard('{ArrowRight}');
    expect(shownPicture()).toBe('/maps/1/castle-cellar/view.webp');
    expect(modal.querySelector('svg line')).toBeNull();
    expect(
      within(modal).queryByRole('button', { name: 'With grid' }),
    ).toBeNull();
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

  it('opens a linked map that is not loaded yet', async () => {
    const server = fakeServer(many(30));
    await renderGallery('/maps?map=map-30', server.api);

    await waitFor(() => expect(dialog()).not.toBeNull());

    expect(heading()).toBe('Map 30');
    expect(server.linked).toEqual(['map-30']);
    expect(within(dialog()!).getByRole('status')).toHaveTextContent(/^Map 30$/);
    expect(
      within(dialog()!).getByTestId('swipe-track').querySelector('img')!
        .parentElement!.className,
    ).toContain('bg-surface');
  });
});
