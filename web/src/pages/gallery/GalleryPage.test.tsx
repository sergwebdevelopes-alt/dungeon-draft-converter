import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { GalleryApi, MapEntry } from '@/features/gallery/index.ts';
import { GalleryPage } from './GalleryPage.tsx';

const CAVE: MapEntry = {
  slug: 'cave',
  title: 'Ice Cave',
  tags: ['Underground'],
  width: 2000,
  height: 3000,
  patreonUrl: 'https://www.patreon.com/LairofArtificer/posts/cave',
  images: {
    card: '/maps/1/cave/card.webp',
    view: '/maps/1/cave/view.webp',
    backdrop: '/maps/1/cave/backdrop.webp',
  },
};

const api: GalleryApi = {
  fetchPage: () =>
    Promise.resolve({ maps: [CAVE], total: 1, tags: ['Underground'] }),
  fetchMap: () => Promise.resolve(null),
  fetchHighlights: () => Promise.resolve([]),
  prefetchFirstPage: () => Promise.resolve(),
};

async function renderPage() {
  render(
    <MemoryRouter initialEntries={['/maps']}>
      <GalleryPage api={api} />
    </MemoryRouter>,
  );
  await screen.findByRole('button', { name: /Ice Cave/ });
}

describe('GalleryPage', () => {
  it('introduces the gallery above the maps', async () => {
    await renderPage();

    const title = screen.getByRole('heading', {
      level: 1,
      name: 'Maps from the Lair',
    });
    const card = screen.getByRole('button', { name: /Ice Cave/ });
    expect(
      title.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(document.title).toBe('Maps · Lair of Artificer');
  });

  it('invites visitors to become members below the maps', async () => {
    await renderPage();

    const membership = screen.getByRole('region', {
      name: 'Join the Lair of Artificer',
    });
    const card = screen.getByRole('button', { name: /Ice Cave/ });
    expect(
      card.compareDocumentPosition(membership) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
