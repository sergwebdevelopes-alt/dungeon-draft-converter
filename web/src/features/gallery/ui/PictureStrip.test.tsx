import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Picture } from '../model/catalog.ts';
import { PictureStrip } from './PictureStrip.tsx';

const PICTURES: Picture[] = [
  { view: '/v/1.webp', thumb: '/t/1.webp', width: 2, height: 1 },
  { view: '/v/2.webp', thumb: '/t/2.webp', width: 2, height: 1 },
  { view: '/v/3.webp', thumb: '/t/3.webp', width: 2, height: 1 },
];

function thumbs() {
  return screen.getAllByRole('button');
}

describe('PictureStrip', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows a thumbnail for every picture and marks the open one', () => {
    render(<PictureStrip pictures={PICTURES} current={1} onSelect={vi.fn()} />);

    expect(
      thumbs().map((button) =>
        button.querySelector('img')?.getAttribute('src'),
      ),
    ).toEqual(['/t/1.webp', '/t/2.webp', '/t/3.webp']);
    expect(
      thumbs().map((button) => button.getAttribute('aria-current')),
    ).toEqual([null, 'true', null]);
    expect(
      screen.getByRole('button', { name: 'Picture 2 of 3' }),
    ).toHaveAttribute('aria-current', 'true');
  });

  it('asks for the picture the visitor picks', async () => {
    const onSelect = vi.fn();
    render(
      <PictureStrip pictures={PICTURES} current={0} onSelect={onSelect} />,
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Picture 3 of 3' }),
    );

    expect(onSelect).toHaveBeenCalledExactlyOnceWith(2);
  });

  it('scrolls only itself to the open thumbnail, never the areas around it', () => {
    const scrollTo = vi.fn();
    const scrollIntoView = vi.fn();
    Element.prototype.scrollTo = scrollTo;
    Element.prototype.scrollIntoView = scrollIntoView;
    const { rerender } = render(
      <PictureStrip pictures={PICTURES} current={0} onSelect={vi.fn()} />,
    );
    scrollTo.mockClear();

    rerender(
      <PictureStrip pictures={PICTURES} current={2} onSelect={vi.fn()} />,
    );

    expect(scrollTo).toHaveBeenCalledExactlyOnceWith({
      left: 0,
      behavior: 'smooth',
    });
    expect(scrollTo.mock.contexts[0]).toBe(screen.getByRole('list'));
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
