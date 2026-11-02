import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MapPreview } from './model/map-preview.ts';
import { useMapPreview, type PreviewState } from './useMapPreview.ts';

const PREVIEW: MapPreview = { image: new Blob(['png']), columns: 20, rows: 25 };

describe('useMapPreview', () => {
  const createObjectURL = vi.fn(() => 'blob:preview');
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is empty without a map', () => {
    const { result } = renderHook(() => useMapPreview(null));

    expect(result.current).toEqual({ status: 'empty' });
  });

  it('reads the map into an image URL with its grid size', async () => {
    const read = vi.fn(() => Promise.resolve(PREVIEW));
    const file = new File(['x'], 'a.dd2vtt');
    const { result } = renderHook(() => useMapPreview(file, read));

    expect(result.current).toEqual({ status: 'loading' });
    await waitFor(() =>
      expect(result.current).toEqual({
        status: 'ready',
        url: 'blob:preview',
        columns: 20,
        rows: 25,
      }),
    );
  });

  it('frees the old image when the map changes', async () => {
    const read = vi.fn(() => Promise.resolve(PREVIEW));
    const first = new File(['1'], 'a.dd2vtt');
    const { result, rerender } = renderHook<
      PreviewState,
      { file: File | null }
    >(({ file }) => useMapPreview(file, read), {
      initialProps: { file: first },
    });
    await waitFor(() => expect(result.current.status).toBe('ready'));

    rerender({ file: null });

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview');
    expect(result.current).toEqual({ status: 'empty' });
  });

  it('reports a map it cannot read', async () => {
    const read = vi.fn(() =>
      Promise.reject(new Error('This file could not be read.')),
    );
    const file = new File(['x'], 'a.dd2vtt');
    const { result } = renderHook(() => useMapPreview(file, read));

    await waitFor(() =>
      expect(result.current).toEqual({
        status: 'error',
        message: 'This file could not be read.',
      }),
    );
  });
});
