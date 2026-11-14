import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { MapEntry } from '../model/catalog.ts';
import { MapDetails } from './MapDetails.tsx';

const MAP: MapEntry = {
  slug: 'inn',
  path: '/maps/curse-of-strahd/inn',
  title: 'Blue Water Inn',
  subtitle: 'Curse of Strahd',
  description: '<p>A <strong>safe haven</strong>.</p>',
  tags: ['Curse of Strahd', 'Interior'],
  squares: { x: 31, y: 14 },
  width: 4340,
  height: 1960,
  patreonUrl: 'https://www.patreon.com/posts/inn',
  images: { card: '/c', view: '/v', backdrop: '/b' },
};

function renderDetails(
  overrides: Partial<Parameters<typeof MapDetails>[0]> = {},
) {
  const onShowGrid = vi.fn();
  render(
    <MapDetails
      map={MAP}
      titleId="title"
      canGrid
      showGrid={false}
      onShowGrid={onShowGrid}
      {...overrides}
    />,
  );

  return onShowGrid;
}

describe('MapDetails', () => {
  it('shows the title, the tags next to the size, the link and the description', () => {
    renderDetails();

    expect(
      screen.getByRole('heading', { name: 'Blue Water Inn' }),
    ).toHaveAttribute('id', 'title');
    const tags = screen.getByRole('list', { name: 'Tags' });
    expect(
      within(tags)
        .getAllByRole('listitem')
        .map((tag) => tag.textContent),
    ).toEqual(['Curse of Strahd', 'Interior']);
    expect(screen.getByText('31 × 14 squares').parentElement).toBe(
      tags.parentElement,
    );
    expect(
      screen.getByRole('link', { name: 'Get it on Patreon' }),
    ).toHaveAttribute('href', 'https://www.patreon.com/posts/inn');
    expect(screen.getByText('safe haven')).toBeInTheDocument();
  });

  it('leaves out the size and the description a map does not have', () => {
    renderDetails({
      map: { ...MAP, squares: undefined, description: undefined },
      canGrid: false,
    });

    expect(screen.queryByText(/squares/)).toBeNull();
    expect(screen.queryByText('safe haven')).toBeNull();
  });

  it('offers the grid only when it fits, and reports the choice', async () => {
    const onShowGrid = renderDetails();

    expect(
      screen.getByRole('button', { name: 'Without grid' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'With grid' }));
    expect(onShowGrid).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('marks the grid as on and lets the visitor turn it off', async () => {
    const onShowGrid = renderDetails({ showGrid: true });

    expect(screen.getByRole('button', { name: 'With grid' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Without grid' }));
    expect(onShowGrid).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('has no grid choice when the grid does not fit the picture', () => {
    renderDetails({ canGrid: false });

    expect(screen.queryByRole('group', { name: 'Grid' })).toBeNull();
  });
});
