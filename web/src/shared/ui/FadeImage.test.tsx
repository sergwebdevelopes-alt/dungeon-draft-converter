import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FadeImage } from './FadeImage.tsx';

function image() {
  return screen.getByRole('img', { name: 'Cave' });
}

describe('FadeImage', () => {
  it('stays hidden until the image has loaded, then fades in', () => {
    render(<FadeImage src="/cave.webp" alt="Cave" />);

    expect(image()).toHaveAttribute('data-loaded', 'false');
    expect(image().className).toContain('opacity-0');
    expect(image().className).toContain('transition-');

    fireEvent.load(image());

    expect(image()).toHaveAttribute('data-loaded', 'true');
    expect(image().className).toContain('opacity-100');
  });

  it('shows an image at once, without a transition, when told not to fade', () => {
    render(<FadeImage src="/cave.webp" alt="Cave" fade={false} />);

    expect(image()).toHaveAttribute('data-loaded', 'true');
    expect(image().className).toContain('opacity-100');
    expect(image().className).not.toContain('transition-');
  });

  it('keeps fading the way it started when the setting changes later', () => {
    const { rerender } = render(<FadeImage src="/cave.webp" alt="Cave" />);

    rerender(<FadeImage src="/cave.webp" alt="Cave" fade={false} />);

    expect(image().className).toContain('transition-');
    expect(image().className).toContain('opacity-0');
  });
});
