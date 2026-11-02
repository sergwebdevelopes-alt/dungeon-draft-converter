import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import sharp from 'sharp';
import type { LoadedMap } from './dd2vtt.ts';
import { bakeLighting, hasBakedLighting, stackLevels } from './lighting.ts';

const SIZE = 200;
const PIXELS_PER_GRID = 100;
const LIMIT = 10_000_000;
const GREY = 200;
const HALF_AMBIENT = '80808080';
const DARK_AMBIENT = 'ff202020';

type Rgba = { r: number; g: number; b: number; alpha: number };

let workDir: string;
let counter = 0;

async function makePng(
  background: Rgba,
  overlay?: { left: number; width: number; color: Rgba },
): Promise<string> {
  const file = path.join(workDir, `input-${counter++}.png`);
  const pixels = Buffer.alloc(SIZE * SIZE * 4);
  for (let i = 0; i < SIZE * SIZE; i++) {
    const x = i % SIZE;
    const inOverlay =
      overlay && x >= overlay.left && x < overlay.left + overlay.width;
    const { r, g, b, alpha } = inOverlay ? overlay.color : background;
    pixels.set([r, g, b, Math.round(alpha * 255)], i * 4);
  }
  await sharp(pixels, { raw: { width: SIZE, height: SIZE, channels: 4 } })
    .png()
    .toFile(file);
  return file;
}

function makeLevel(
  image: string,
  metadata: Record<string, unknown> = {},
): LoadedMap {
  return {
    fileNameWithExt: 'Map.dd2vtt',
    fileNameWithoutExt: 'Map',
    image,
    pixelsPerGrid: PIXELS_PER_GRID,
    metadata,
  };
}

function light(x: number, y: number, range: number): Record<string, unknown> {
  return {
    position: { x, y },
    range,
    intensity: 1,
    color: 'ffffffff',
    shadows: true,
  };
}

async function pixelAt(image: string, x: number, y: number): Promise<number[]> {
  const { data, info } = await sharp(image)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const start = (y * info.width + x) * info.channels;
  return [...data.subarray(start, start + info.channels)];
}

function assertNear(actual: number, expected: number, tolerance = 3): void {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

before(async () => {
  workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dd2vtt-lighting-'));
});

after(async () => {
  await fs.rm(workDir, { recursive: true, force: true });
});

describe('hasBakedLighting', () => {
  it('is true only when environment.baked_lighting is true', () => {
    const level = (environment: unknown) => makeLevel('x.png', { environment });

    assert.equal(hasBakedLighting(level({ baked_lighting: true })), true);
    assert.equal(hasBakedLighting(level({ baked_lighting: false })), false);
    assert.equal(hasBakedLighting(level({ baked_lighting: 'true' })), false);
    assert.equal(hasBakedLighting(level({})), false);
    assert.equal(hasBakedLighting(level(undefined)), false);
  });
});

describe('bakeLighting', () => {
  const grey = { r: GREY, g: GREY, b: GREY, alpha: 1 };

  it('returns the level unchanged when the lighting is already baked', async () => {
    const level = makeLevel(await makePng(grey), {
      environment: { baked_lighting: true, ambient_light: HALF_AMBIENT },
    });

    assert.equal(await bakeLighting(level, workDir, LIMIT), level);
  });

  it('returns the level unchanged when there is no grid', async () => {
    const level = {
      ...makeLevel(await makePng(grey), {
        environment: { ambient_light: HALF_AMBIENT },
      }),
      pixelsPerGrid: undefined,
    };

    assert.equal(await bakeLighting(level, workDir, LIMIT), level);
  });

  it('writes a new image in the work folder and marks the lighting as baked', async () => {
    const level = makeLevel(await makePng(grey), {
      environment: { ambient_light: HALF_AMBIENT, other: 'kept' },
      walls: [],
    });

    const baked = await bakeLighting(level, workDir, LIMIT);

    assert.notEqual(baked.image, level.image);
    assert.equal(path.dirname(baked.image), workDir);
    assert.equal(path.extname(baked.image), '.v');
    assert.deepEqual(baked.metadata, {
      environment: {
        ambient_light: HALF_AMBIENT,
        other: 'kept',
        baked_lighting: true,
      },
      walls: [],
    });
    assert.equal(hasBakedLighting(level), false);
    const { width, height } = await sharp(baked.image).metadata();
    assert.deepEqual({ width, height }, { width: SIZE, height: SIZE });
  });

  it('darkens the image by the ambient light and keeps the alpha', async () => {
    const level = makeLevel(await makePng(grey), {
      environment: { ambient_light: HALF_AMBIENT },
    });

    const baked = await bakeLighting(level, workDir, LIMIT);

    const [r, g, b, alpha] = await pixelAt(baked.image, 100, 100);
    for (const channel of [r, g, b]) {
      assertNear(channel, Math.round((GREY * 0x80) / 255));
    }
    assert.equal(alpha, 255);
  });

  it('keeps full brightness when there is no ambient light setting', async () => {
    const level = makeLevel(await makePng(grey));

    const baked = await bakeLighting(level, workDir, LIMIT);

    const [r] = await pixelAt(baked.image, 100, 100);
    assertNear(r, GREY);
  });

  it('brightens the pixels near a light', async () => {
    const level = makeLevel(await makePng(grey), {
      environment: { ambient_light: DARK_AMBIENT },
      lights: [light(0.5, 0.5, 1)],
    });

    const baked = await bakeLighting(level, workDir, LIMIT);

    const [near] = await pixelAt(baked.image, 50, 50);
    const [far] = await pixelAt(baked.image, 190, 190);
    assertNear(far, Math.round((GREY * 0x20) / 255));
    assert.ok(near > far + 50, `near ${near} should be brighter than ${far}`);
  });

  it('ignores lights without a positive range', async () => {
    const level = makeLevel(await makePng(grey), {
      environment: { ambient_light: DARK_AMBIENT },
      lights: [light(0.5, 0.5, 0)],
    });

    const baked = await bakeLighting(level, workDir, LIMIT);

    const [near] = await pixelAt(baked.image, 50, 50);
    assertNear(near, Math.round((GREY * 0x20) / 255));
  });

  it('lets walls block the light', async () => {
    const image = await makePng(grey);
    const metadata = {
      environment: { ambient_light: DARK_AMBIENT },
      lights: [light(0.5, 1, 1.5)],
    };
    const wall = [
      [
        { x: 1, y: 0 },
        { x: 1, y: 2 },
      ],
    ];

    const open = await bakeLighting(makeLevel(image, metadata), workDir, LIMIT);
    const walled = await bakeLighting(
      makeLevel(image, { ...metadata, line_of_sight: wall }),
      workDir,
      LIMIT,
    );

    const [openBehind] = await pixelAt(open.image, 150, 100);
    const [walledBehind] = await pixelAt(walled.image, 150, 100);
    const [walledInFront] = await pixelAt(walled.image, 50, 100);
    assert.ok(
      openBehind > walledBehind + 20,
      `open ${openBehind} should be brighter than walled ${walledBehind}`,
    );
    assertNear(walledBehind, Math.round((GREY * 0x20) / 255));
    assert.ok(walledInFront > walledBehind + 50);
  });
});

describe('stackLevels', () => {
  const red = { r: 255, g: 0, b: 0, alpha: 1 };
  const green = { r: 0, g: 255, b: 0, alpha: 1 };
  const clear = { r: 0, g: 0, b: 0, alpha: 0 };

  it('shows the lower level through the transparent parts of the upper one', async () => {
    const upper = makeLevel(
      await makePng(red, { left: 0, width: SIZE / 2, color: clear }),
    );
    const lower = makeLevel(await makePng(green));

    const image = await stackLevels(
      [upper, lower],
      SIZE,
      SIZE,
      workDir,
      LIMIT,
      1,
    );

    const { format, width, height } = await sharp(image).metadata();
    assert.deepEqual(
      { format, width, height },
      { format: 'png', width: SIZE, height: SIZE },
    );
    assert.deepEqual((await pixelAt(image, 50, 100)).slice(0, 3), [0, 255, 0]);
    assert.deepEqual((await pixelAt(image, 150, 100)).slice(0, 3), [255, 0, 0]);
  });

  it('stacks more than two levels with the first one on top', async () => {
    const top = makeLevel(
      await makePng(red, { left: 0, width: SIZE / 2, color: clear }),
    );
    const middle = makeLevel(
      await makePng(clear, {
        left: 0,
        width: SIZE / 4,
        color: { r: 0, g: 0, b: 255, alpha: 1 },
      }),
    );
    const bottom = makeLevel(await makePng(green));

    const image = await stackLevels(
      [top, middle, bottom],
      SIZE,
      SIZE,
      workDir,
      LIMIT,
      1,
    );

    assert.deepEqual((await pixelAt(image, 25, 100)).slice(0, 3), [0, 0, 255]);
    assert.deepEqual((await pixelAt(image, 75, 100)).slice(0, 3), [0, 255, 0]);
    assert.deepEqual((await pixelAt(image, 150, 100)).slice(0, 3), [255, 0, 0]);
  });
});
