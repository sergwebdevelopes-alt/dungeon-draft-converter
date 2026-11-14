import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { ConverterTeaser } from './ConverterTeaser.tsx';

function renderTeaser() {
  render(
    <MemoryRouter>
      <ConverterTeaser />
    </MemoryRouter>,
  );

  return within(screen.getByRole('region', { name: /Up to 10 levels/ }));
}

describe('ConverterTeaser', () => {
  it('leads with merging levels and links to the converter', () => {
    const teaser = renderTeaser();

    expect(
      teaser.getByRole('heading', { level: 2, name: /One map\./ }),
    ).toBeInTheDocument();
    expect(
      teaser.getByText(/Dungeondraft merges two levels at a time/),
    ).toBeInTheDocument();
    expect(
      teaser.getByRole('link', { name: 'Open the converter' }),
    ).toHaveAttribute('href', '/converter');
  });

  it('shows the levels of a map merging into one', () => {
    const teaser = renderTeaser();

    expect(
      teaser.getByRole('img', {
        name: 'Castle Ravenloft, 8 levels merged into one map',
      }),
    ).toBeInTheDocument();
  });

  it('lists what else the converter does', () => {
    const teaser = renderTeaser();

    expect(
      teaser.getAllByRole('listitem').map((benefit) => benefit.textContent),
    ).toEqual([
      'Up to 10 levelsMerged into one map',
      'Every light keptLower floors still glow',
      'Your logoIn the corner, any size',
      'JPG · WebP · FoundryImages and .dd2vtt',
      '70 · 140 · 300 pxFor screen or print',
      'Grid or no gridBoth in one download',
    ]);
  });
});
