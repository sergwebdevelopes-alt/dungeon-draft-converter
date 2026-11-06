import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SwipeCarousel, type Slide } from './SwipeCarousel.tsx';

function slide(key: string): Slide {
  return { key, content: <img src={`/${key}.webp`} alt={key} /> };
}

function carousel(previous: Slide | null, current: Slide, next: Slide | null) {
  return (
    <SwipeCarousel
      previous={previous}
      current={current}
      next={next}
      onPrevious={vi.fn()}
      onNext={vi.fn()}
      onDismiss={vi.fn()}
    >
      <button type="button">Close</button>
    </SwipeCarousel>
  );
}

function image(key: string) {
  return document.querySelector(`img[src="/${key}.webp"]`);
}

describe('SwipeCarousel', () => {
  it('lays the neighbours either side of the current slide, hidden from screen readers', () => {
    render(carousel(slide('a'), slide('b'), slide('c')));

    const places = ['a', 'b', 'c'].map(
      (key) => image(key)?.parentElement?.style.transform,
    );
    expect(places).toEqual([
      'translateX(-100%)',
      'translateX(0%)',
      'translateX(100%)',
    ]);
    expect(screen.getByRole('img', { name: 'b' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'a' })).toBeNull();
    expect(screen.queryByRole('img', { name: 'c' })).toBeNull();
  });

  it('draws no slide where there is no neighbour', () => {
    render(carousel(null, slide('b'), null));

    expect(document.querySelectorAll('img')).toHaveLength(1);
  });

  it('keeps the overlays outside the moving track', () => {
    render(carousel(null, slide('b'), slide('c')));

    const track = screen.getByTestId('swipe-track');
    expect(track.contains(screen.getByRole('button', { name: 'Close' }))).toBe(
      false,
    );
  });

  it('reuses the next slide as the current one instead of drawing it again', () => {
    const { rerender } = render(carousel(slide('a'), slide('b'), slide('c')));
    const next = image('c');

    rerender(carousel(slide('b'), slide('c'), slide('d')));

    expect(image('c')).toBe(next);
    expect(image('c')?.parentElement?.style.transform).toBe('translateX(0%)');
    expect(screen.getByRole('img', { name: 'c' })).toBeInTheDocument();
  });
});
