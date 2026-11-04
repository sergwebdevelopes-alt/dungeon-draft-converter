import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MapEntry } from '../../gallery/index.ts';
import { Hero } from './Hero.tsx';

function entry(slug: string, title: string): MapEntry {
  return {
    slug,
    title,
    subtitle: 'Ground floor',
    squares: { x: 30, y: 20 },
    tags: [],
    width: 3000,
    height: 2000,
    patreonUrl: 'https://example.com',
    images: {
      card: `/maps/1/${slug}/card.webp`,
      view: `/maps/1/${slug}/view.webp`,
      backdrop: `/maps/1/${slug}/backdrop.webp`,
    },
  };
}

const MAPS = [entry('cave', 'Ice Cave'), entry('inn', 'Blue Inn')];

function renderHero() {
  render(
    <MemoryRouter>
      <Hero maps={MAPS} />
    </MemoryRouter>,
  );
}

function shown(): string | null {
  const picker = screen.getByRole('group', { name: 'Backdrop maps' });
  const pressed = within(picker)
    .getAllByRole('button')
    .find((button) => button.getAttribute('aria-pressed') === 'true');

  return pressed?.getAttribute('aria-label') ?? null;
}

function wait(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe('Hero', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the backdrop image of the first map', () => {
    renderHero();
    const hero = screen.getByRole('region', {
      name: 'Battle maps for epic adventures',
    });

    expect(hero.querySelector('img')).toHaveAttribute(
      'src',
      '/maps/1/cave/backdrop.webp',
    );
  });

  it('rotates the backdrop on its own', () => {
    renderHero();

    wait(8000);

    expect(shown()).toBe('Show Blue Inn');
  });

  it('holds the backdrop while the pointer is over the hero', () => {
    renderHero();
    const hero = screen.getByRole('region', {
      name: 'Battle maps for epic adventures',
    });

    fireEvent.pointerEnter(hero);
    wait(12000);
    expect(shown()).toBe('Show Ice Cave');

    fireEvent.pointerLeave(hero);
    wait(8000);
    expect(shown()).toBe('Show Blue Inn');
  });

  it('holds the backdrop while keyboard focus is inside the hero', () => {
    renderHero();

    act(() => screen.getByRole('link', { name: 'Browse the maps' }).focus());
    wait(12000);
    expect(shown()).toBe('Show Ice Cave');

    act(() => screen.getByRole('link', { name: 'Browse the maps' }).blur());
    wait(8000);
    expect(shown()).toBe('Show Blue Inn');
  });
});
