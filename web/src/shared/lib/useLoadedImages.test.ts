import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useLoadedImages, type LoadingImage } from './useLoadedImages.ts';

function fakeImages() {
  const started: { src: string; finish: () => void }[] = [];

  function createImage(): LoadingImage {
    const image = {
      src: '',
      finish: () => undefined as void,
      addEventListener(_type: 'load', listener: () => void) {
        image.finish = listener;
      },
    };
    started.push(image);

    return image;
  }

  function finish(src: string) {
    act(() => started.find((image) => image.src === src)?.finish());
  }

  return { started, createImage, finish };
}

describe('useLoadedImages', () => {
  it('starts loading every image and tells which ones have arrived', () => {
    const { started, createImage, finish } = fakeImages();

    const { result } = renderHook(() =>
      useLoadedImages(['/a.webp', '/b.webp'], createImage),
    );

    expect(started.map((image) => image.src)).toEqual(['/a.webp', '/b.webp']);
    expect([...result.current]).toEqual([]);

    finish('/b.webp');
    expect([...result.current]).toEqual(['/b.webp']);

    finish('/a.webp');
    expect([...result.current].sort()).toEqual(['/a.webp', '/b.webp']);
  });

  it('does not load the same list again on another render', () => {
    const { started, createImage } = fakeImages();
    const { rerender } = renderHook(() =>
      useLoadedImages(['/a.webp'], createImage),
    );

    rerender();

    expect(started).toHaveLength(1);
  });

  it('loads nothing for an empty list', () => {
    const { started, createImage } = fakeImages();

    renderHook(() => useLoadedImages([], createImage));

    expect(started).toEqual([]);
  });
});
