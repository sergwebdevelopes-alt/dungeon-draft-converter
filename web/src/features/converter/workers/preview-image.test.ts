import { afterEach, describe, expect, it, vi } from 'vitest';
import { PREVIEW_SIDE, shrinkForPreview } from './preview-image.ts';

interface Drawn {
  width: number;
  height: number;
  smoothing: string;
  format: { type: string; quality: number };
}

const SMALLER = new Blob(['smaller'], { type: 'image/webp' });

function fakeGraphics(width: number, height: number) {
  const drawn: Drawn[] = [];
  const picture = { width, height, close: vi.fn() };

  class FakeCanvas {
    readonly width: number;
    readonly height: number;
    private readonly context = {
      imageSmoothingQuality: '',
      drawImage: () => undefined,
    };

    constructor(canvasWidth: number, canvasHeight: number) {
      this.width = canvasWidth;
      this.height = canvasHeight;
    }

    getContext() {
      return this.context;
    }

    convertToBlob(format: Drawn['format']) {
      drawn.push({
        width: this.width,
        height: this.height,
        smoothing: this.context.imageSmoothingQuality,
        format,
      });

      return Promise.resolve(SMALLER);
    }
  }

  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(() => Promise.resolve(picture)),
  );
  vi.stubGlobal('OffscreenCanvas', FakeCanvas);

  return { drawn, picture };
}

describe('shrinkForPreview', () => {
  const image = new Blob(['a huge map'], { type: 'image/png' });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('makes a big picture small enough for the preview, keeping its shape', async () => {
    const { drawn, picture } = fakeGraphics(12_000, 8_800);

    expect(PREVIEW_SIDE).toBe(2048);
    expect(await shrinkForPreview(image)).toBe(SMALLER);
    expect(drawn).toEqual([
      {
        width: PREVIEW_SIDE,
        height: Math.round((8_800 * PREVIEW_SIDE) / 12_000),
        smoothing: 'high',
        format: { type: 'image/webp', quality: 0.9 },
      },
    ]);
    expect(picture.close).toHaveBeenCalledTimes(1);
  });

  it('measures a tall picture by its height', async () => {
    const { drawn } = fakeGraphics(4_000, 8_000);

    await shrinkForPreview(image);

    expect([drawn[0].width, drawn[0].height]).toEqual([
      PREVIEW_SIDE / 2,
      PREVIEW_SIDE,
    ]);
  });

  it('leaves a picture that is small enough as it is', async () => {
    const { drawn, picture } = fakeGraphics(PREVIEW_SIDE, 1_000);

    expect(await shrinkForPreview(image)).toBe(image);
    expect(drawn).toEqual([]);
    expect(picture.close).toHaveBeenCalledTimes(1);
  });

  it('keeps the picture where the browser cannot shrink it', async () => {
    vi.stubGlobal('createImageBitmap', undefined);
    vi.stubGlobal('OffscreenCanvas', undefined);

    expect(await shrinkForPreview(image)).toBe(image);
  });

  it('keeps the picture when it cannot be read or drawn', async () => {
    const { picture } = fakeGraphics(12_000, 8_800);
    vi.stubGlobal(
      'OffscreenCanvas',
      class {
        getContext() {
          return null;
        }
      },
    );

    expect(await shrinkForPreview(image)).toBe(image);
    expect(picture.close).toHaveBeenCalledTimes(1);

    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(() => Promise.reject(new Error('Not a picture.'))),
    );

    expect(await shrinkForPreview(image)).toBe(image);
  });
});
