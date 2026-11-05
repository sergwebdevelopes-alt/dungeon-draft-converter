import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import sharp from 'sharp';
import {
  renderMapImagesWithSharp,
  scaledCrop,
} from './sharp-map-image-renderer.ts';

const CARD = { zoom: 0.8, width: 640, height: 800, quality: 70 };

async function original(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: '#4a7a3a' },
  })
    .jpeg()
    .toBuffer();
}

describe('scaledCrop', () => {
  it('fits the crop to the height of a wide image and centres it', () => {
    assert.deepEqual(scaledCrop({ width: 4000, height: 2000 }, CARD), {
      scaled: { width: 2000, height: 1000 },
      left: 680,
      top: 100,
    });
  });

  it('fits the crop to the width of a tall image', () => {
    assert.deepEqual(scaledCrop({ width: 2000, height: 4000 }, CARD), {
      scaled: { width: 800, height: 1600 },
      left: 80,
      top: 400,
    });
  });

  it('never scales the image below the crop size', () => {
    const { scaled, left, top } = scaledCrop({ width: 641, height: 801 }, CARD);

    assert.ok(scaled.width >= CARD.width && scaled.height >= CARD.height);
    assert.ok(left + CARD.width <= scaled.width);
    assert.ok(top + CARD.height <= scaled.height);
  });
});

describe('renderMapImagesWithSharp', () => {
  it('renders the card, view and backdrop as WebP at their sizes', async () => {
    const images = await renderMapImagesWithSharp(await original(4760, 2240));

    const sizes = await Promise.all(
      [images.card, images.view, images.backdrop].map((image) =>
        sharp(image).metadata(),
      ),
    );
    assert.deepEqual(
      sizes.map(({ format, width, height }) => [format, width, height]),
      [
        ['webp', 640, 800],
        ['webp', 2000, 941],
        ['webp', 2400, 1500],
      ],
    );
  });

  it('keeps a tall view within the long edge', async () => {
    const { view } = await renderMapImagesWithSharp(await original(1500, 3000));

    const { width, height } = await sharp(view).metadata();
    assert.deepEqual([width, height], [1000, 2000]);
  });

  it('rejects data that is not an image', async () => {
    await assert.rejects(renderMapImagesWithSharp(Buffer.from('not an image')));
  });
});
