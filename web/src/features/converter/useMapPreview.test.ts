import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MapPreview } from './model/map-preview.ts';
import { useMapPreview, type PreviewState } from './useMapPreview.ts';

function preview(name: string): MapPreview {
  return { image: new Blob([name]), columns: 20, rows: 25 };
}

describe('useMapPreview', () => {
  let urls = 0;
  const revokeObjectURL = vi.fn();
  const read = vi.fn((file: File) =>
    file.name === 'broken.dd2vtt'
      ? Promise.reject(
          new Error('This file could not be read as a Dungeondraft map.'),
        )
      : Promise.resolve(preview(file.name)),
  );

  beforeEach(() => {
    urls = 0;
    Object.assign(URL, {
      createObjectURL: vi.fn(() => `blob:${++urls}`),
      revokeObjectURL,
    });
    revokeObjectURL.mockClear();
    read.mockClear();
  });

  function renderPreviews(files: File[]) {
    return renderHook<PreviewState, { files: File[] }>(
      ({ files: current }) => useMapPreview(current, read),
      { initialProps: { files } },
    );
  }

  it('is empty without maps', () => {
    const { result } = renderPreviews([]);

    expect(result.current).toEqual({ status: 'empty' });
  });

  it('shows the main map with its grid size', async () => {
    const { result } = renderPreviews([new File(['1'], 'Tower.dd2vtt')]);

    expect(result.current).toEqual({ status: 'loading' });
    await waitFor(() =>
      expect(result.current).toEqual({
        status: 'ready',
        layers: ['blob:1'],
        columns: 20,
        rows: 25,
      }),
    );
  });

  it('stacks levels like the export: lower levels first, the main map on top', async () => {
    const tower = new File(['1'], 'Tower.dd2vtt');
    const cellar = new File(['2'], 'Cellar.dd2vtt');
    const { result, rerender } = renderPreviews([tower, cellar]);
    await waitFor(() =>
      expect(
        result.current.status === 'ready' && result.current.layers,
      ).toHaveLength(2),
    );

    expect(result.current).toMatchObject({ layers: ['blob:2', 'blob:1'] });

    rerender({ files: [cellar, tower] });

    expect(result.current).toMatchObject({ layers: ['blob:1', 'blob:2'] });
    expect(read).toHaveBeenCalledTimes(2);
  });

  it('frees the image of a removed level', async () => {
    const tower = new File(['1'], 'Tower.dd2vtt');
    const cellar = new File(['2'], 'Cellar.dd2vtt');
    const { result, rerender } = renderPreviews([tower, cellar]);
    await waitFor(() =>
      expect(
        result.current.status === 'ready' && result.current.layers,
      ).toHaveLength(2),
    );

    rerender({ files: [tower] });

    await waitFor(() =>
      expect(result.current).toMatchObject({ layers: ['blob:1'] }),
    );
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:2');
  });

  it('reports a main map it cannot read', async () => {
    const { result } = renderPreviews([new File(['x'], 'broken.dd2vtt')]);

    await waitFor(() =>
      expect(result.current).toEqual({
        status: 'error',
        message: 'This file could not be read as a Dungeondraft map.',
      }),
    );
  });

  it('frees every image when the page closes', async () => {
    const { result, unmount } = renderPreviews([
      new File(['1'], 'Tower.dd2vtt'),
    ]);
    await waitFor(() => expect(result.current.status).toBe('ready'));

    unmount();

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:1');
  });
});
