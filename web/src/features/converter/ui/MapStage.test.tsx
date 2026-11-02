import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PreviewState } from '../model/map-preview.ts';
import { MapStage } from './MapStage.tsx';

const READY: PreviewState = {
  status: 'ready',
  layers: ['blob:map'],
  columns: 4,
  rows: 3,
};

function renderStage(overrides: Partial<Parameters<typeof MapStage>[0]> = {}) {
  const onAddMaps = vi.fn();
  render(
    <MapStage
      preview={READY}
      grid="without"
      logo={null}
      placement={null}
      busy={false}
      disabled={false}
      onAddMaps={onAddMaps}
      {...overrides}
    />,
  );
  return { onAddMaps };
}

function gridLayer() {
  return screen.queryByTestId('grid-layer');
}

describe('MapStage', () => {
  beforeEach(() => {
    Object.assign(URL, {
      createObjectURL: vi.fn(() => 'blob:logo'),
      revokeObjectURL: vi.fn(),
    });
  });

  it('asks for maps before one is added', () => {
    renderStage({ preview: { status: 'empty' } });

    expect(
      screen.getByText('Drop your .dd2vtt files here'),
    ).toBeInTheDocument();
  });

  it('shows the main map without a grid', () => {
    renderStage();

    expect(
      screen.getByRole('img', { name: 'Preview of the main map' }),
    ).toHaveAttribute('src', 'blob:map');
    expect(gridLayer()).toBeNull();
  });

  it('draws the grid at the map size when the grid is chosen', () => {
    renderStage({ grid: 'with' });

    expect(gridLayer()).not.toBeNull();
    expect(gridLayer()!.querySelectorAll('line')).toHaveLength(5 + 4);
    expect(screen.queryByRole('slider')).toBeNull();
  });

  it('compares both versions with a slider', () => {
    renderStage({ grid: 'both' });

    const slider = screen.getByRole('slider', {
      name: 'Compare without and with the grid',
    });
    expect(gridLayer()).toHaveStyle({ transform: 'translateX(50%)' });
    expect(screen.getByTestId('grid-lines')).toHaveStyle({
      transform: 'translateX(-50%)',
    });

    fireEvent.change(slider, { target: { value: '20' } });

    expect(gridLayer()).toHaveStyle({ transform: 'translateX(20%)' });
    expect(screen.getByTestId('grid-lines')).toHaveStyle({
      transform: 'translateX(-20%)',
    });
    expect(screen.getByTestId('grid-divider')).toHaveStyle({
      transform: 'translateX(20%)',
    });
  });

  it('places the logo like the export does', async () => {
    renderStage({
      logo: new File(['l'], 'logo.png', { type: 'image/png' }),
      placement: { size: 10, margin: 3 },
    });

    const logo = await screen.findByTestId('logo-preview');
    expect(logo).toHaveStyle({
      width: 'calc(min(100cqw, 100cqh) * 0.1)',
      right: 'calc(min(100cqw, 100cqh) * 0.03)',
    });
  });

  it('stacks merged levels with the main map on top', () => {
    renderStage({
      preview: {
        status: 'ready',
        layers: ['blob:cellar', 'blob:tower'],
        columns: 4,
        rows: 3,
      },
    });

    const images = [...document.querySelectorAll('img')].map((img) =>
      img.getAttribute('src'),
    );
    expect(images).toEqual(['blob:cellar', 'blob:tower']);
    expect(
      screen.getByRole('img', { name: 'Preview of the main map' }),
    ).toHaveAttribute('src', 'blob:tower');
  });

  it('explains when a map cannot be previewed', () => {
    renderStage({
      preview: {
        status: 'error',
        message: 'This file could not be read as a Dungeondraft map.',
      },
    });

    expect(
      screen.getByText(
        'This file could not be read as a Dungeondraft map. It can still be converted.',
      ),
    ).toBeInTheDocument();
  });

  it('adds maps dropped onto the preview', () => {
    const { onAddMaps } = renderStage();
    const level = new File(['x'], 'Cellar.dd2vtt');

    fireEvent.drop(
      screen.getByRole('img', { name: 'Preview of the main map' }),
      {
        dataTransfer: { files: [level] },
      },
    );

    expect(onAddMaps).toHaveBeenCalledWith([level]);
  });
});
