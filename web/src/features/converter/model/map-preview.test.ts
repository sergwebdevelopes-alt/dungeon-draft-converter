import { describe, expect, it } from 'vitest';
import { readMapPreview } from './map-preview.ts';

const PNG_HEADER = 'iVBORw0KGgoAAAANSUhEUg==';

function dd2vtt(content: unknown, name = 'Cave.dd2vtt'): File {
  return new File([JSON.stringify(content)], name);
}

function valid(overrides: Record<string, unknown> = {}) {
  return {
    format: 0.3,
    resolution: {
      map_origin: { x: 0, y: 0 },
      map_size: { x: 20, y: 25 },
      pixels_per_grid: 100,
    },
    image: PNG_HEADER,
    ...overrides,
  };
}

describe('readMapPreview', () => {
  it('reads the image and the grid size', async () => {
    const preview = await readMapPreview(dd2vtt(valid()));

    expect(preview.columns).toBe(20);
    expect(preview.rows).toBe(25);
    expect(preview.image.type).toBe('image/png');
    expect(
      new Uint8Array(await preview.image.arrayBuffer()).slice(0, 4),
    ).toEqual(new Uint8Array([0x89, 0x50, 0x4e, 0x47]));
  });

  it('rounds fractional grid sizes', async () => {
    const preview = await readMapPreview(
      dd2vtt(valid({ resolution: { map_size: { x: 20.4, y: 24.6 } } })),
    );

    expect([preview.columns, preview.rows]).toEqual([20, 25]);
  });

  it('rejects files that are not Dungeondraft maps', async () => {
    const message = 'This file could not be read as a Dungeondraft map.';

    await expect(
      readMapPreview(new File(['{not json'], 'a.dd2vtt')),
    ).rejects.toThrow(message);
    await expect(readMapPreview(dd2vtt(valid({ image: 42 })))).rejects.toThrow(
      message,
    );
    await expect(
      readMapPreview(dd2vtt(valid({ image: '%%%' }))),
    ).rejects.toThrow(message);
    await expect(
      readMapPreview(dd2vtt(valid({ resolution: {} }))),
    ).rejects.toThrow(message);
    await expect(
      readMapPreview(
        dd2vtt(valid({ resolution: { map_size: { x: 0, y: 5 } } })),
      ),
    ).rejects.toThrow(message);
  });
});
