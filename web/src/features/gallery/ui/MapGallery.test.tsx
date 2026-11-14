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
  useParams,
} from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { MapsResponse } from '@contracts/gallery-api.ts';
import type { GalleryApi } from '../api/gallery-api.ts';
import type { MapEntry } from '../model/catalog.ts';
import type { PageRequest } from '../model/map-pages.ts';
import { OpenMapSlug, useOpenedMapWindow } from '../hooks/useOpenMap.ts';
import { MapGallery } from './MapGallery.tsx';
import { MapWindow } from './MapWindow.tsx';

function collectionSlug(name: string): string {
  return name.toLowerCase();
}

function entry(slug: string, title: string, tags: MapEntry['tags']): MapEntry {
  return {
    slug,
    path: `/maps/${collectionSlug(tags[0])}/${slug}`,
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
let navigateForward: () => void = () => undefined;

function Probe() {
  const location = useLocation();
  const navigate = useNavigate();
  navigateBack = () => void navigate(-1);
  navigateForward = () => void navigate(1);

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

function pageFrom(maps: MapEntry[], { tag, offset, limit }: PageRequest) {
  const matching = tag
    ? maps.filter((map) => map.tags.map(collectionSlug).includes(tag))
    : maps;
  const tags = [...new Set(maps.flatMap((map) => map.tags))];

  return {
    maps: matching.slice(offset, offset + limit),
    total: matching.length,
    tags,
    collections: tags.map((name) => ({
      name,
      path: `/maps/${collectionSlug(name)}`,
    })),
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
        return answer(request, pageFrom(maps, request));
      },
      fetchMap(slug) {
        linked.push(slug);
        return Promise.resolve(maps.find((map) => map.slug === slug) ?? null);
      },
      fetchHighlights: () => Promise.resolve([]),
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

function GalleryRoute({ api }: { api: GalleryApi }) {
  const { collection = null } = useParams();

  return <MapGallery api={api} collection={collection} />;
}

function Site({ api }: { api: GalleryApi }) {
  const location = useLocation();
  const opened = useOpenedMapWindow();

  return (
    <OpenMapSlug value={opened?.map.slug ?? null}>
      <Routes location={opened?.background ?? location}>
        <Route path="/maps/:collection?" element={<GalleryRoute api={api} />} />
        <Route path="/maps/:collection/:map" element={<p>The map page</p>} />
        <Route path="/" element={<p>The home page</p>} />
      </Routes>
      {opened && <MapWindow map={opened.map} morph={opened.morph} />}
      <Probe />
    </OpenMapSlug>
  );
}

function renderSite(path: string, api = fakeApi(), from = '/') {
  render(
    <MemoryRouter initialEntries={[from, path]} initialIndex={1}>
      <Site api={api} />
    </MemoryRouter>,
  );
}

async function renderGallery(path = '/maps', api = fakeApi(), from = '/') {
  renderSite(path, api, from);
  await screen.findByRole('navigation', { name: 'Filter maps' });
}

async function renderOpen(title: string, api = fakeApi()) {
  await renderGallery('/maps', api);
  await userEvent.click(card(title));
}

function cardImage(title: string) {
  return card(title).querySelector('img');
}

async function renderGalleryError() {
  render(
    <MemoryRouter initialEntries={['/maps']}>
      <MapGallery api={fakeApi(new Error('down'))} />
    </MemoryRouter>,
  );
  await screen.findByRole('alert');
}

async function renderCastle() {
  await renderOpen('Castle', fakeApi([CASTLE, ...MAPS]));
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

function zoomedPicture(): HTMLElement {
  const track = within(dialog()!).getByTestId('swipe-track');
  const shown = [...track.children].find(
    (slide) => !slide.hasAttribute('aria-hidden'),
  );

  return shown!.firstElementChild!.firstElementChild as HTMLElement;
}

function location() {
  return screen.getByTestId('location').textContent;
}

function dialog() {
  return screen.queryByRole('dialog');
}

function card(title: string) {
  return screen.getByRole('link', { name: new RegExp(title) });
}

describe('MapGallery', () => {
  it('shows every map and filters by tag', async () => {
    await renderGallery();

    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(cardImage('Ice Cave')).toHaveAttribute(
      'src',
      '/maps/1/cave/card.webp',
    );

    await userEvent.click(screen.getByRole('link', { name: 'Underground' }));
    await waitFor(() =>
      expect(screen.getAllByRole('listitem')).toHaveLength(2),
    );
    expect(screen.queryByText('Blue Inn')).toBeNull();
    expect(location()).toBe('/maps/underground');
    expect(screen.getByRole('link', { name: 'Underground' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await userEvent.click(screen.getByRole('link', { name: 'All maps' }));
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
    expect(within(modal!).getByText('20 × 30 squares')).toBeInTheDocument();
    expect(within(modal!).queryByText(/Ground floor/)).toBeNull();
    const squares = within(modal!).getByText('20 × 30 squares');
    const tags = within(modal!).getByRole('list', { name: 'Tags' });
    expect(within(tags).getByText('Interior')).toBeInTheDocument();
    expect(tags.parentElement).toBe(squares.parentElement);
    expect(tags.className).not.toMatch(/hidden/);
    expect(
      within(modal!).getByRole('link', { name: 'Get it on Patreon' }),
    ).toHaveAttribute(
      'href',
      'https://www.patreon.com/LairofArtificer/posts/inn',
    );
    expect(location()).toBe('/maps/interior/inn');
  });

  it('names the tab after the open map', async () => {
    await renderGallery();
    expect(document.title).toBe('D&D Battle Map Gallery · Lair of Artificer');

    await userEvent.click(card('Blue Inn'));
    await waitFor(() =>
      expect(document.title).toBe(
        'Blue Inn, Ground floor Battle Map · Interior · Lair of Artificer',
      ),
    );

    fireEvent(dialog()!, new Event('cancel', { cancelable: true }));
    await waitFor(() =>
      expect(document.title).toBe('D&D Battle Map Gallery · Lair of Artificer'),
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

  it('shows the map page, not the window, to a visitor who comes by a link', async () => {
    renderSite('/maps/underground/crypt');

    expect(await screen.findByText('The map page')).toBeInTheDocument();
    expect(dialog()).toBeNull();
  });

  it('shows the map page again after the page is reloaded with the window open', async () => {
    await renderOpen('Old Crypt');
    const afterReload = { ...window.history.state } as { usr?: object };
    expect(dialog()).not.toBeNull();
    cleanup();

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/maps/underground/crypt',
            state: { ...afterReload.usr, visit: 'an earlier visit' },
          },
        ]}
      >
        <Site api={fakeApi()} />
      </MemoryRouter>,
    );

    expect(await screen.findByText('The map page')).toBeInTheDocument();
    expect(dialog()).toBeNull();
  });

  it('opens the window again when the visitor goes forward to it', async () => {
    await renderOpen('Old Crypt');
    act(() => navigateBack());
    await waitFor(() => expect(dialog()).toBeNull());

    act(() => navigateForward());

    await waitFor(() => expect(dialog()).not.toBeNull());
    expect(location()).toBe('/maps/underground/crypt');
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(3);
  });

  it('moves between the pictures of a map with the arrow keys and buttons, going round at the ends', async () => {
    await renderCastle();

    await userEvent.keyboard('{ArrowRight}');
    expect(shownPicture()).toBe('/maps/1/castle-roof/view.webp');
    expect(within(dialog()!).getByRole('status')).toHaveTextContent(
      'Castle, picture 2 of 3',
    );
    expect(heading()).toBe('Castle');
    expect(location()).toBe('/maps/underground/castle');

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

  it('closes when the visitor clicks outside the window', async () => {
    await renderCastle();

    await userEvent.click(dialog()!);

    expect(dialog()).toBeNull();
  });

  it('stays open when a drag that began on the picture ends outside the window', async () => {
    await renderCastle();
    const window = dialog()!;

    fireEvent.mouseDown(within(window).getByTestId('swipe-track'));
    fireEvent.click(window);

    expect(dialog()).toBe(window);
  });

  it('zooms the picture with one button and goes back with the same one', async () => {
    await renderCastle();

    await userEvent.click(screen.getByRole('button', { name: 'Zoom in' }));

    expect(zoomedPicture().style.transform).toBe(
      'translate(0px, 0px) scale(2)',
    );
    expect(screen.queryByRole('button', { name: 'Zoom in' })).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Zoom out' }));

    expect(zoomedPicture().style.transform).toBe('');
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeInTheDocument();
  });

  it('zooms with the plus, minus and zero keys', async () => {
    await renderCastle();

    await userEvent.keyboard('+');
    await userEvent.keyboard('+');
    expect(zoomedPicture().style.transform).toBe(
      'translate(0px, 0px) scale(2.25)',
    );

    await userEvent.keyboard('-');
    expect(zoomedPicture().style.transform).toBe(
      'translate(0px, 0px) scale(1.5)',
    );

    await userEvent.keyboard('0');
    expect(zoomedPicture().style.transform).toBe('');
  });

  it('shows the next picture at its own size, at once, and forgets the zoom', async () => {
    await renderCastle();
    await userEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    const cover = zoomedPicture();

    await userEvent.click(screen.getByRole('button', { name: 'Next picture' }));

    expect(shownPicture()).toBe('/maps/1/castle-roof/view.webp');
    expect(zoomedPicture().style.transform).toBe('');
    expect(cover.style.transform).toBe('');
    expect(cover.style.transition).toBe('none');
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'Previous picture' }),
    );

    expect(zoomedPicture()).toBe(cover);
    expect(cover.style.transform).toBe('');
  });

  it('holds the pictures still while one is zoomed', async () => {
    await renderCastle();
    const track = within(dialog()!).getByTestId('swipe-track');
    expect(track).toHaveAttribute('draggable', 'false');

    await userEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(track).not.toHaveAttribute('draggable');

    await userEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(track).toHaveAttribute('draggable', 'false');
  });

  it('holds the pictures still while two fingers are on the picture', async () => {
    await renderCastle();
    const track = within(dialog()!).getByTestId('swipe-track');
    const stage = zoomedPicture().parentElement!;

    fireEvent.pointerDown(stage, { pointerId: 1, pointerType: 'touch' });
    fireEvent.pointerDown(stage, { pointerId: 2, pointerType: 'touch' });
    expect(track).not.toHaveAttribute('draggable');

    fireEvent.pointerUp(stage, { pointerId: 2, pointerType: 'touch' });
    expect(track).toHaveAttribute('draggable', 'false');
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

  it('scrolls the text inside the window and zooms the picture with the plain wheel', async () => {
    await renderOpen('Blue Inn');
    const modal = dialog()!;

    expect(
      within(modal)
        .getByRole('heading', { level: 2, name: 'Blue Inn' })
        .closest('.overflow-y-auto'),
    ).not.toBeNull();
    expect(
      fireEvent.wheel(within(modal).getByRole('img', { name: /Blue Inn/ }), {
        deltaY: -300,
      }),
    ).toBe(false);
  });

  it('makes every card a link to the page of its map', async () => {
    await renderGallery('/maps', fakeApi([CASTLE, ...MAPS]));

    expect(card('Castle')).toHaveAttribute('href', '/maps/underground/castle');
    expect(card('Blue Inn')).toHaveAttribute('href', '/maps/interior/inn');
  });

  it('leaves a click with Ctrl or Cmd to the browser, so the map opens in a new tab', async () => {
    await renderGallery('/maps', fakeApi([CASTLE, ...MAPS]));

    fireEvent.click(card('Castle'), { ctrlKey: true });
    fireEvent.click(card('Castle'), { metaKey: true });

    expect(dialog()).toBeNull();
    expect(location()).toBe('/maps');
  });

  it('hands the picture of the open map over from its card', async () => {
    await renderGallery('/maps', fakeApi([CASTLE, ...MAPS]));
    expect(cardImage('Castle')).not.toBeNull();

    await userEvent.click(card('Castle'));

    expect(cardImage('Castle')).toBeNull();
    expect(cardImage('Ice Cave')).not.toBeNull();
  });

  it('shows a picture that has already loaded at once when the visitor jumps to it', async () => {
    class LoadedAtOnce {
      src = '';
      addEventListener(_type: string, listener: () => void) {
        queueMicrotask(listener);
      }
    }
    vi.stubGlobal('Image', LoadedAtOnce);

    try {
      await renderCastle();
      await userEvent.click(
        screen.getByRole('button', { name: 'Picture 3 of 3' }),
      );

      const shown = within(dialog()!)
        .getByTestId('swipe-track')
        .querySelector('img[src="/maps/1/castle-cellar/view.webp"]')!;
      expect(shown.className).toContain('opacity-100');
      expect(shown.className).not.toContain('transition-');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('fades in a picture that has not loaded yet', async () => {
    await renderCastle();
    await userEvent.click(
      screen.getByRole('button', { name: 'Picture 3 of 3' }),
    );

    const shown = within(dialog()!)
      .getByTestId('swipe-track')
      .querySelector('img[src="/maps/1/castle-cellar/view.webp"]')!;
    expect(shown.className).toContain('transition-');
  });

  it('goes round a map with two pictures in both directions', async () => {
    const two = { ...CASTLE, pictures: CASTLE.pictures?.slice(0, 2) };
    await renderOpen('Castle', fakeApi([two, ...MAPS]));

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
    await renderOpen('Ice Cave');
    const modal = dialog()!;

    expect(modal.querySelector('svg line')).toBeNull();

    await userEvent.click(
      within(modal).getByRole('button', { name: 'With grid' }),
    );

    expect(modal.querySelectorAll('svg line')).toHaveLength(21 + 31);
    expect(
      within(modal).getByRole('button', { name: 'With grid' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(modal).getByRole('button', { name: 'With grid' }).className,
    ).toContain('min-h-8');
  });

  it('shows the description of a map from Patreon', async () => {
    await renderOpen('Blue Inn');
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
    await renderOpen('Ice Cave');

    expect(
      within(dialog()!).queryByRole('region', { name: 'Description' }),
    ).toBeNull();
  });

  it('shows a map without a known size without the grid choice', async () => {
    await renderOpen('Old Crypt');
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
        <MapGallery
          api={fakeServer(MAPS, () => new Promise(() => undefined)).api}
        />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('list', { name: 'Loading maps' }),
    ).toBeInTheDocument();
    expect(document.title).toBe('D&D Battle Map Gallery · Lair of Artificer');
    cleanup();

    await renderGalleryError();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The maps could not be loaded.',
    );
  });

  it('builds the filter from the collections the server lists', async () => {
    await renderGallery();

    const filters = within(
      screen.getByRole('navigation', { name: 'Filter maps' }),
    );
    expect(
      filters
        .getAllByRole('link')
        .map((link) => [link.textContent, link.getAttribute('href')]),
    ).toEqual([
      ['All maps', '/maps'],
      ['Underground', '/maps/underground'],
      ['Interior', '/maps/interior'],
    ]);
    expect(filters.getByRole('link', { name: 'All maps' })).toHaveAttribute(
      'aria-current',
      'page',
    );
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

    await userEvent.click(screen.getByRole('link', { name: 'Interior' }));
    await waitFor(() => expect(listedMaps()).toHaveLength(1));

    expect(server.requests.at(-1)).toEqual({
      tag: 'interior',
      offset: 0,
      limit: 21,
    });
    expect(screen.getByRole('link', { name: 'Interior' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'All maps' })).not.toHaveAttribute(
      'aria-current',
    );
    expect(document.title).toBe('Interior Battle Maps · Lair of Artificer');
  });

  it('shows the collection named in the address from the start', async () => {
    const server = fakeServer();
    await renderGallery('/maps/underground', server.api);

    await waitFor(() => expect(listedMaps()).toHaveLength(2));
    expect(server.requests).toEqual([
      { tag: 'underground', offset: 0, limit: 21 },
    ]);
    expect(document.title).toBe('Underground Battle Maps · Lair of Artificer');
  });

  it('names the tab after the chosen collection while its maps are still loading', async () => {
    const server = fakeServer(MAPS, (request, page) =>
      request.tag === 'interior'
        ? new Promise(() => undefined)
        : Promise.resolve(page),
    );
    await renderGallery('/maps/underground', server.api);
    await waitFor(() =>
      expect(document.title).toBe(
        'Underground Battle Maps · Lair of Artificer',
      ),
    );

    await userEvent.click(screen.getByRole('link', { name: 'Interior' }));

    expect(
      screen.getByRole('list', { name: 'Loading maps' }),
    ).toBeInTheDocument();
    expect(document.title).toBe('Interior Battle Maps · Lair of Artificer');
  });

  it('leaves the tab as the server named it until it knows the collection', () => {
    document.title = 'Named by the server';
    renderSite(
      '/maps/underground',
      fakeServer(MAPS, () => new Promise(() => undefined)).api,
    );

    expect(
      screen.getByRole('list', { name: 'Loading maps' }),
    ).toBeInTheDocument();
    expect(document.title).toBe('Named by the server');
  });

  it('keeps the gallery where it was when a map window opens over it', async () => {
    const server = fakeServer();
    await renderGallery('/maps/underground', server.api);
    await waitFor(() => expect(listedMaps()).toHaveLength(2));

    await userEvent.click(card('Old Crypt'));

    expect(dialog()).not.toBeNull();
    expect(location()).toBe('/maps/underground/crypt');
    expect(server.requests).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Underground' })).toHaveAttribute(
      'aria-current',
      'page',
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
});
