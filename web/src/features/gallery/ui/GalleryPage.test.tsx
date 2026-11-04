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
import type { GalleryApi } from '../api.ts';
import type { MapEntry } from '../model/catalog.ts';
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

const MAPS = [
  entry('cave', 'Ice Cave', ['Underground']),
  entry('inn', 'Blue Inn', ['Interior']),
  UNSIZED,
];

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

function fakeApi(maps: MapEntry[] | Error = MAPS): GalleryApi {
  return {
    fetchMaps: () =>
      maps instanceof Error ? Promise.reject(maps) : Promise.resolve(maps),
    prefetchMaps: () => Promise.resolve(),
  };
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
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.queryByText('Blue Inn')).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'All maps' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
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
          api={{ ...fakeApi(), fetchMaps: () => new Promise(() => undefined) }}
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

  it('builds the filter from the tags the maps use', async () => {
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
});
