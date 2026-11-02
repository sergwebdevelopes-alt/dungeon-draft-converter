import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Backdrop } from './Backdrop.tsx';

const IMAGES = ['/a.webp', '/b.webp', '/c.webp', '/d.webp'];

function sources(container: HTMLElement): string[] {
  return [...container.querySelectorAll('img')].map(
    (img) => img.getAttribute('src') ?? '',
  );
}

describe('Backdrop', () => {
  it('loads only the current image and the next one', () => {
    const { container } = render(<Backdrop images={IMAGES} index={0} />);

    expect(sources(container)).toEqual(['/a.webp', '/b.webp']);
  });

  it('keeps shown images so they can fade out', () => {
    const { container, rerender } = render(
      <Backdrop images={IMAGES} index={0} />,
    );

    rerender(<Backdrop images={IMAGES} index={1} />);

    expect(sources(container)).toEqual(['/a.webp', '/b.webp', '/c.webp']);
  });

  it('asks for the first image before anything else', () => {
    const { container } = render(<Backdrop images={IMAGES} index={0} />);

    expect(container.querySelector('img')).toHaveAttribute(
      'fetchpriority',
      'high',
    );
  });
});
