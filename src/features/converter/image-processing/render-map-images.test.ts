import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp, { type Sharp } from 'sharp';
import { crc32 } from 'node:zlib';
import {
  makeImages,
  checkLogoImage,
  checkLogoPercent,
  FORMAT_PRESETS,
  InvalidLogoError,
  InvalidLogoPlacementError,
  InvalidMapImageError,
  MapTooLargeError,
  type ImageOptions,
  type OutputFile,
} from './render-map-images.ts';
import type { FormatPreset } from '../../../contracts/converter-api.ts';
import { newImagePath, type LoadedMap } from './read-dd2vtt-file.ts';

async function makeTinyPng(file: string): Promise<void> {
  await sharp({
    create: {
      width: 10,
      height: 10,
      channels: 3,
      background: { r: 200, g: 40, b: 40 },
    },
  })
    .png()
    .toFile(file);
}

function makeMap(
  name: string,
  image: string,
  pixelsPerGrid?: number,
): LoadedMap {
  return {
    fileNameWithExt: `${name}.dd2vtt`,
    fileNameWithoutExt: name,
    image,
    pixelsPerGrid,
    metadata: {},
  };
}

async function convertAll(
  map: LoadedMap,
  workDir: string,
  options?: ImageOptions,
) {
  const { files } = await makeImages(map, workDir, options);
  const result = new Map<string, OutputFile>();
  for await (const file of files) {
    result.set(file.path, file);
  }
  return result;
}

describe('makeImages (integration)', () => {
  let workDir: string;
  let gridded: Map<string, OutputFile>;
  let gridless: Map<string, OutputFile>;

  before(async () => {
    workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dd2vtt-test-'));
    const png = path.join(workDir, 'tiny.png');
    await makeTinyPng(png);
    gridded = await convertAll(makeMap('TinyMap', png, 5), workDir);
    gridless = await convertAll(makeMap('nogrid', png), workDir);
  });

  after(async () => {
    await fs.rm(workDir, { recursive: true, force: true });
  });

  it('produces NoGrid and Grid variants for every preset when a grid exists', () => {
    for (const preset of FORMAT_PRESETS) {
      for (const variant of ['NoGrid', 'Grid']) {
        assert.ok(
          gridded.has(
            `${preset.name}/TinyMap_${preset.ppi}px_${variant}.${preset.format}`,
          ),
        );
      }
    }
  });

  it('produces only NoGrid variants when pixels_per_grid is absent', () => {
    assert.deepEqual(
      [...gridless.keys()].sort(),
      FORMAT_PRESETS.map(
        (preset) =>
          `${preset.name}/nogrid_${preset.ppi}px_NoGrid.${preset.format}`,
      ).sort(),
    );
  });

  it('resizes each preset so a grid square measures ppi pixels', async () => {
    for (const preset of FORMAT_PRESETS) {
      for (const variant of ['NoGrid', 'Grid']) {
        const file = gridded.get(
          `${preset.name}/TinyMap_${preset.ppi}px_${variant}.${preset.format}`,
        );
        const meta = await sharp(file!.data).metadata();
        assert.equal(meta.width, 2 * preset.ppi);
        assert.equal(meta.height, 2 * preset.ppi);
      }
    }
  });

  it('carries the preset DPI tag', async () => {
    const jpg = await sharp(
      gridded.get('JPG_300/TinyMap_300px_NoGrid.jpg')!.data,
    ).metadata();
    assert.equal(jpg.density, 300);
  });

  it('keeps native dimensions when pixels_per_grid is absent', async () => {
    const jpg = await sharp(
      gridless.get('JPG_300/nogrid_300px_NoGrid.jpg')!.data,
    ).metadata();
    assert.equal(jpg.width, 10);
    assert.equal(jpg.height, 10);
    assert.equal(jpg.density, 300);
  });
});

const WEBP_140 = FORMAT_PRESETS.find((preset) => preset.name === 'WEBP_140')!;
const JPG_70 = FORMAT_PRESETS.find((preset) => preset.name === 'JPG_70')!;
const JPG_300 = FORMAT_PRESETS.find((preset) => preset.name === 'JPG_300')!;

function solidImage(width: number, height: number) {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 120, g: 120, b: 120 },
    },
  });
}

async function makePng(
  file: string,
  width: number,
  height: number,
): Promise<string> {
  await solidImage(width, height).png().toFile(file);
  return file;
}

async function pngWithHeaderSize(
  width: number,
  height: number,
): Promise<Buffer> {
  const png = await solidImage(1, 1).png().toBuffer();

  png.writeUInt32BE(width, 16);
  png.writeUInt32BE(height, 20);
  png.writeUInt32BE(crc32(png.subarray(12, 29)), 29);

  return png;
}

async function imageSize(data: Buffer): Promise<[number, number]> {
  const { width, height } = await sharp(data).metadata();
  return [width, height];
}

describe('makeImages output size', () => {
  let workDir: string;

  before(async () => {
    workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dd2vtt-size-'));
  });

  after(async () => {
    await fs.rm(workDir, { recursive: true, force: true });
  });

  async function convertOne(
    name: string,
    size: [number, number],
    pixelsPerGrid: number | undefined,
    preset: FormatPreset,
  ): Promise<Map<string, OutputFile>> {
    const png = await makePng(path.join(workDir, `${name}.png`), ...size);
    return convertAll(makeMap(name, png, pixelsPerGrid), workDir, {
      presets: [preset],
      variants: ['NoGrid'],
    });
  }

  it('lowers the WebP pixels per square when a side would exceed 16383 px', async () => {
    const files = await convertOne('Wide', [200, 1], 1, WEBP_140);

    assert.deepEqual([...files.keys()], ['WEBP_81/Wide_81px_NoGrid.webp']);
    assert.deepEqual(
      await imageSize(files.get('WEBP_81/Wide_81px_NoGrid.webp')!.data),
      [16200, 81],
    );
  });

  it('lowers the WebP pixels per square when it would exceed 100 megapixels', async () => {
    const files = await convertOne('Square', [100, 100], 1, WEBP_140);

    assert.deepEqual([...files.keys()], ['WEBP_100/Square_100px_NoGrid.webp']);
    assert.deepEqual(
      await imageSize(files.get('WEBP_100/Square_100px_NoGrid.webp')!.data),
      [10000, 10000],
    );
  });

  it('keeps WEBP_140 when the map just fits', async () => {
    const files = await convertOne('Fits', [117, 1], 1, WEBP_140);

    assert.deepEqual([...files.keys()], ['WEBP_140/Fits_140px_NoGrid.webp']);
    assert.deepEqual(
      await imageSize(files.get('WEBP_140/Fits_140px_NoGrid.webp')!.data),
      [16380, 140],
    );
  });

  it('shrinks a gridless WebP to the limit but keeps the WEBP_140 name', async () => {
    const files = await convertOne('Gridless', [20000, 1], undefined, WEBP_140);

    assert.deepEqual(
      [...files.keys()],
      ['WEBP_140/Gridless_140px_NoGrid.webp'],
    );
    assert.deepEqual(
      await imageSize(files.get('WEBP_140/Gridless_140px_NoGrid.webp')!.data),
      [16383, 1],
    );
  });

  it('rejects a JPG output over 250 megapixels', async () => {
    const png = await makePng(path.join(workDir, 'huge.png'), 100, 100);

    await assert.rejects(
      () =>
        makeImages(makeMap('Huge', png, 1), workDir, { presets: [JPG_300] }),
      (error: Error) =>
        error instanceof MapTooLargeError &&
        error.message ===
          '"Huge.dd2vtt" would be 30000×30000 px in JPG_300, which exceeds the limit of 250 megapixels. Try unselecting the larger formats.',
    );
  });
});

describe('makeImages map image checks', () => {
  let workDir: string;

  before(async () => {
    workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dd2vtt-check-'));
  });

  after(async () => {
    await fs.rm(workDir, { recursive: true, force: true });
  });

  async function rejectsImage(data: Buffer, message: RegExp): Promise<void> {
    const file = newImagePath(workDir, 'img');
    await fs.writeFile(file, data);

    await assert.rejects(
      () => makeImages(makeMap('Bad', file, 70), workDir),
      (error: Error) =>
        error instanceof InvalidMapImageError && message.test(error.message),
    );
  }

  it('rejects a map image over 200 megapixels', async () => {
    await rejectsImage(
      await pngWithHeaderSize(20000, 10001),
      /^The image in "Bad\.dd2vtt" is 20000×10001 px, which exceeds the limit of 200 megapixels\.$/,
    );
  });

  it('rejects a GIF map image', async () => {
    await rejectsImage(
      await solidImage(4, 4).gif().toBuffer(),
      /^The image in "Bad\.dd2vtt" must be PNG, JPG or WebP, got GIF\.$/,
    );
  });

  it('rejects a TIFF map image', async () => {
    await rejectsImage(
      await solidImage(4, 4).tiff().toBuffer(),
      /must be PNG, JPG or WebP, got TIFF\.$/,
    );
  });

  it('rejects bytes that are not an image', async () => {
    await rejectsImage(
      Buffer.from('not an image'),
      /^The image in "Bad\.dd2vtt" could not be read\.$/,
    );
  });
});

describe('checkLogoPercent', () => {
  it('accepts the limits', () => {
    checkLogoPercent('size', 2);
    checkLogoPercent('size', 20);
    checkLogoPercent('margin', 0);
    checkLogoPercent('margin', 5);
  });

  const invalid: ['size' | 'margin', number, string][] = [
    ['size', 1.9, 'Logo size must be a number between 2% and 20%.'],
    ['size', 21, 'Logo size must be a number between 2% and 20%.'],
    ['size', Number.NaN, 'Logo size must be a number between 2% and 20%.'],
    ['margin', -0.5, 'Logo margin must be a number between 0% and 5%.'],
    ['margin', 5.5, 'Logo margin must be a number between 0% and 5%.'],
    [
      'margin',
      Number.POSITIVE_INFINITY,
      'Logo margin must be a number between 0% and 5%.',
    ],
  ];

  for (const [setting, value, message] of invalid) {
    it(`rejects ${setting} ${value}`, () => {
      assert.throws(
        () => checkLogoPercent(setting, value),
        (error: Error) =>
          error instanceof InvalidLogoPlacementError &&
          error.message === message,
      );
    });
  }

  it('makes makeImages reject a bad logo placement', async () => {
    const logo = { image: Buffer.alloc(0), size: 50, margin: 3 };

    await assert.rejects(
      () => makeImages(makeMap('Map', 'missing.png', 70), '/nowhere', { logo }),
      InvalidLogoPlacementError,
    );
  });
});

describe('checkLogoImage', () => {
  const notAnImage = (error: Error) =>
    error instanceof InvalidLogoError &&
    error.message === 'Logo must be a PNG, JPG or WebP image.';

  it('accepts a small PNG', async () => {
    await checkLogoImage(await solidImage(8, 8).png().toBuffer());
  });

  it('accepts a logo of exactly 25 megapixels', async () => {
    await checkLogoImage(await pngWithHeaderSize(5000, 5000));
  });

  it('rejects bytes that are not an image', async () => {
    await assert.rejects(
      () => checkLogoImage(Buffer.from('hello')),
      notAnImage,
    );
  });

  it('rejects a GIF logo', async () => {
    await assert.rejects(
      async () => checkLogoImage(await solidImage(4, 4).gif().toBuffer()),
      notAnImage,
    );
  });

  it('rejects a logo over 25 megapixels', async () => {
    await assert.rejects(
      async () => checkLogoImage(await pngWithHeaderSize(6000, 5000)),
      (error: Error) =>
        error instanceof InvalidLogoError &&
        error.message === 'Logo dimensions are too large (max 25 megapixels).',
    );
  });
});

describe('makeImages logo', () => {
  let workDir: string;
  let withLogo: Sharp;
  let withoutLogo: Sharp;

  async function convertJpg(png: string, options: ImageOptions) {
    const files = await convertAll(makeMap('Logo', png), workDir, {
      presets: [JPG_70],
      variants: ['NoGrid'],
      ...options,
    });
    return sharp(files.get('JPG_70/Logo_70px_NoGrid.jpg')!.data);
  }

  async function pixel(image: Sharp, x: number, y: number): Promise<number[]> {
    const { data } = await image
      .clone()
      .extract({ left: x, top: y, width: 1, height: 1 })
      .raw()
      .toBuffer({ resolveWithObject: true });
    return [...data];
  }

  before(async () => {
    workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dd2vtt-logo-'));
    const png = await makePng(path.join(workDir, 'map.png'), 100, 100);
    const logo = await sharp({
      create: {
        width: 20,
        height: 20,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .png()
      .toBuffer();

    withLogo = await convertJpg(png, {
      logo: { image: logo, size: 10, margin: 3 },
    });
    withoutLogo = await convertJpg(png, {});
  });

  after(async () => {
    await fs.rm(workDir, { recursive: true, force: true });
  });

  it('draws the logo in the bottom-right corner', async () => {
    const [r, g, b] = await pixel(withLogo, 92, 92);

    assert.ok(r > 200 && g < 60 && b < 60, `got ${r},${g},${b}`);
    assert.notDeepEqual(
      await pixel(withLogo, 92, 92),
      await pixel(withoutLogo, 92, 92),
    );
  });

  it('leaves the rest of the map untouched', async () => {
    assert.deepEqual(
      await pixel(withLogo, 10, 10),
      await pixel(withoutLogo, 10, 10),
    );
  });
});
