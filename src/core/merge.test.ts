import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import sharp from 'sharp';
import type { LoadedMap } from './dd2vtt.ts';
import { UnprocessableError } from '../shared/errors.ts';
import { LevelMismatchError, mergeLevels } from './merge.ts';

const SIZE = 200;
const PIXELS_PER_GRID = 100;

let workDir: string;
let counter = 0;

async function makePng(
  width: number,
  height: number,
  opaque: (x: number) => boolean,
): Promise<string> {
  const file = path.join(workDir, `input-${counter++}.png`);
  const pixels = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const alpha = opaque(i % width) ? 255 : 0;
    pixels.set([120, 120, 120, alpha], i * 4);
  }
  await sharp(pixels, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(file);
  return file;
}

function makeLevel(
  name: string,
  image: string,
  metadata: Record<string, unknown> = {},
): LoadedMap {
  return {
    fileNameWithExt: `${name}.dd2vtt`,
    fileNameWithoutExt: name,
    image,
    pixelsPerGrid: PIXELS_PER_GRID,
    metadata: {
      resolution: {
        map_origin: { x: 0, y: 0 },
        map_size: { x: 2, y: 2 },
        pixels_per_grid: PIXELS_PER_GRID,
      },
      ...metadata,
    },
  };
}

function light(x: number, y: number): Record<string, unknown> {
  return {
    position: { x, y },
    range: 0.5,
    intensity: 1,
    color: 'ffffffff',
    shadows: true,
  };
}

async function readJson(
  dd2vtt: AsyncIterable<Buffer>,
): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of dd2vtt) {
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<
    string,
    unknown
  >;
}

function leftHalfOpaque(x: number): boolean {
  return x < SIZE / 2;
}

function opaque(): boolean {
  return true;
}

before(async () => {
  workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dd2vtt-merge-'));
});

after(async () => {
  await fs.rm(workDir, { recursive: true, force: true });
});

describe('mergeLevels', () => {
  it('rejects a level whose image size differs from the main map', async () => {
    const main = makeLevel('Main', await makePng(SIZE, SIZE, opaque));
    const lower = makeLevel('Lower', await makePng(SIZE, 100, opaque));

    await assert.rejects(
      () => mergeLevels([main, lower], 'Merged.dd2vtt', workDir),
      (error: unknown) => {
        assert.ok(error instanceof LevelMismatchError);
        assert.ok(error instanceof UnprocessableError);
        assert.equal(
          error.message,
          '"Lower.dd2vtt" is 200×100 px, but the main map "Main.dd2vtt" is 200×200 px.',
        );
        return true;
      },
    );
  });

  it('rejects a level whose grid differs from the main map', async () => {
    const image = await makePng(SIZE, SIZE, opaque);
    const main = makeLevel('Main', image);
    const shifted = makeLevel('Lower', image, {
      resolution: { map_origin: { x: 1, y: 0 }, map_size: { x: 2, y: 2 } },
    });
    const resized = makeLevel('Lower', image, {
      resolution: { map_origin: { x: 0, y: 0 }, map_size: { x: 4, y: 4 } },
    });
    const denser = { ...makeLevel('Lower', image), pixelsPerGrid: 50 };
    const message =
      '"Lower.dd2vtt" has a different grid (origin, size or pixels per square) than the main map "Main.dd2vtt".';

    for (const lower of [shifted, resized, denser]) {
      await assert.rejects(
        () => mergeLevels([main, lower], 'Merged.dd2vtt', workDir),
        (error: unknown) => {
          assert.ok(error instanceof LevelMismatchError);
          assert.equal(error.message, message);
          return true;
        },
      );
    }
  });

  it('needs at least two levels', async () => {
    const main = makeLevel('Main', await makePng(SIZE, SIZE, opaque));

    await assert.rejects(
      () => mergeLevels([main], 'Merged.dd2vtt', workDir),
      /at least one level below/,
    );
  });

  it('names the merged map as given and marks its lighting as baked', async () => {
    const main = makeLevel('Main', await makePng(SIZE, SIZE, leftHalfOpaque), {
      environment: { ambient_light: 'ff808080' },
    });
    const lower = makeLevel('Lower', await makePng(SIZE, SIZE, opaque));

    const merged = await mergeLevels(
      [main, lower],
      'Main_merged.dd2vtt',
      workDir,
    );

    assert.equal(merged.map.fileNameWithExt, 'Main_merged.dd2vtt');
    assert.equal(merged.map.fileNameWithoutExt, 'Main_merged');
    assert.equal(merged.map.pixelsPerGrid, PIXELS_PER_GRID);
    assert.deepEqual(merged.map.metadata.environment, {
      ambient_light: 'ff808080',
      baked_lighting: true,
    });
    const { width, height } = await sharp(merged.map.image).metadata();
    assert.deepEqual({ width, height }, { width: SIZE, height: SIZE });
  });

  it('writes a Foundry file without baked lighting when a level is unlit', async () => {
    const main = makeLevel('Main', await makePng(SIZE, SIZE, leftHalfOpaque), {
      environment: { baked_lighting: true },
    });
    const lower = makeLevel('Lower', await makePng(SIZE, SIZE, opaque));

    const merged = await mergeLevels([main, lower], 'Merged.dd2vtt', workDir);

    const json = await readJson(merged.dd2vtt);
    assert.deepEqual(json.environment, { baked_lighting: false });
    assert.deepEqual(json.resolution, main.metadata.resolution);
    assert.equal(typeof json.image, 'string');
  });

  it('writes a Foundry file with baked lighting when every level is baked', async () => {
    const environment = { baked_lighting: true };
    const main = makeLevel('Main', await makePng(SIZE, SIZE, leftHalfOpaque), {
      environment,
    });
    const lower = makeLevel('Lower', await makePng(SIZE, SIZE, opaque), {
      environment,
    });

    const merged = await mergeLevels([main, lower], 'Merged.dd2vtt', workDir);

    const json = await readJson(merged.dd2vtt);
    assert.deepEqual(json.environment, { baked_lighting: true });
  });

  it('embeds the stacked image in the Foundry file', async () => {
    const main = makeLevel('Main', await makePng(SIZE, SIZE, leftHalfOpaque));
    const lower = makeLevel('Lower', await makePng(SIZE, SIZE, opaque));

    const merged = await mergeLevels([main, lower], 'Merged.dd2vtt', workDir);

    const json = await readJson(merged.dd2vtt);
    const image = Buffer.from(json.image as string, 'base64');
    const { data } = await sharp(image)
      .ensureAlpha()
      .extractChannel(3)
      .raw()
      .toBuffer({ resolveWithObject: true });
    assert.ok(data.every((alpha) => alpha === 255));
  });

  it('keeps lower-level lights only where the level above is transparent', async () => {
    const mainLight = light(0.5, 0.5);
    const visible = light(1.5, 1);
    const covered = light(0.5, 1.5);
    const main = makeLevel('Main', await makePng(SIZE, SIZE, leftHalfOpaque), {
      lights: [mainLight],
    });
    const lower = makeLevel('Lower', await makePng(SIZE, SIZE, opaque), {
      lights: [visible, covered],
    });

    const merged = await mergeLevels([main, lower], 'Merged.dd2vtt', workDir);

    assert.deepEqual(merged.lights, { main: 1, added: 1, dropped: 1 });
    assert.deepEqual(merged.map.metadata.lights, [mainLight, visible]);
    const json = await readJson(merged.dd2vtt);
    assert.deepEqual(json.lights, [mainLight, visible]);
  });

  it('drops a bottom light covered by a middle level', async () => {
    const shown = light(1.75, 1);
    const hidden = light(1.25, 1);
    const top = makeLevel('Top', await makePng(SIZE, SIZE, leftHalfOpaque));
    const middle = makeLevel(
      'Middle',
      await makePng(SIZE, SIZE, (x) => x >= 100 && x < 150),
    );
    const bottom = makeLevel('Bottom', await makePng(SIZE, SIZE, opaque), {
      lights: [shown, hidden],
    });

    const merged = await mergeLevels(
      [top, middle, bottom],
      'Merged.dd2vtt',
      workDir,
    );

    assert.deepEqual(merged.lights, { main: 0, added: 1, dropped: 1 });
    assert.deepEqual(merged.map.metadata.lights, [shown]);
  });
});
