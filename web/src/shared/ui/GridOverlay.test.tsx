import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GridOverlay } from './GridOverlay.tsx';

describe('GridOverlay', () => {
  it('draws one line between each pair of squares', () => {
    const { container } = render(<GridOverlay columns={4} rows={3} />);

    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('viewBox', '0 0 4 3');
    expect(svg.querySelectorAll('line')).toHaveLength(3 + 2);
  });

  it('draws nothing for a single square', () => {
    const { container } = render(<GridOverlay columns={1} rows={1} />);

    expect(container.querySelectorAll('line')).toHaveLength(0);
  });
});
