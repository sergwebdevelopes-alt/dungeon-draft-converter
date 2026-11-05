import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import sharp from 'sharp';
import { convertLevels, type ConversionFile } from './convert-levels.ts';
import type { LoadedMap } from '../domain/loaded-map.ts';
import { UnprocessableError } from '../../../shared/errors.ts';
import { FORMAT_PRESETS } from '../image-processing/render-map-images.ts';

const SIZE = 200;
const PIXELS_PER_GRID = 100;
const ORIGINAL_CONTENT = '{"format":0.3,"image":"original"}';
const JPG_70 = FORMAT_PRESETS.filter((preset) => preset.name === 'JPG_70');
const SMALL_PRESETS = FORMAT_PRESETS.filter((preset) =>
  ['JPG_70', 'WEBP_140'].includes(preset.name),
);

let workDir: string;
let image: string;
let original: string;

async function makePng(file: string): Promise<void> {
  await sharp({
    create: {
      width: SIZE,
      height: SIZE,
      channels: 4,
      background: { r: 90, g: 140, b: 60, alpha: 1 },
    },
  })
    .png()
    .toFile(file);
}

function makeLevel(name: string, pixelsPerGrid?: number): LoadedMap {
  return {
    fileNameWithExt: `${name}.dd2vtt`,
    fileNameWithoutExt: name,
    image,
    pixelsPerGrid,
    metadata: { resolution: { pixels_per_grid: pixelsPerGrid } },
  };
}

async function readData(data: ConversionFile['data']): Promise<Buffer> {
  if (Buffer.isBuffer(data)) {
    return data;
  }
  const chunks: Buffer[] = [];
  for await (const chunk of data) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function collect(
  files: AsyncIterable<ConversionFile>,
): Promise<{ path: string; data: Buffer }[]> {
  const result: { path: string; data: Buffer }[] = [];
  for await (const file of files) {
    result.push({ path: file.path, data: await readData(file.data) });
  }
  return result;
}

before(async () => {
  workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dd2vtt-conversion-'));
  image = path.join(workDir, 'map.png');
  original = path.join(workDir, 'original.dd2vtt');
  await makePng(image);
  await fs.writeFile(original, ORIGINAL_CONTENT);
});

after(async () => {
  await fs.rm(workDir, { recursive: true, force: true });
});

describe('convertLevels', () => {
  it('names a single map after its file and puts the original file first', async () => {
    const result = await convertLevels(
      {
        levels: [makeLevel('Tavern', PIXELS_PER_GRID)],
        original,
        presets: SMALL_PRESETS,
      },
      workDir,
    );

    const files = await collect(result.files);

    assert.equal(result.name, 'Tavern');
    assert.deepEqual(
      files.map((file) => file.path),
      [
        'FOUNDRY_VTT_DD2VTT/Tavern.dd2vtt',
        'JPG_70/Tavern_70px_NoGrid.jpg',
        'JPG_70/Tavern_70px_Grid.jpg',
        'WEBP_140/Tavern_140px_NoGrid.webp',
        'WEBP_140/Tavern_140px_Grid.webp',
      ],
    );
    assert.equal(files[0].data.toString('utf8'), ORIGINAL_CONTENT);
    const { format, width } = await sharp(files[1].data).metadata();
    assert.deepEqual({ format, width }, { format: 'jpeg', width: 140 });
  });

  it('converts a single map without an original file, leaving out the Foundry copy', async () => {
    const result = await convertLevels(
      { levels: [makeLevel('Tavern', PIXELS_PER_GRID)], presets: JPG_70 },
      workDir,
    );

    const files = await collect(result.files);

    assert.equal(result.name, 'Tavern');
    assert.deepEqual(
      files.map((file) => file.path),
      ['JPG_70/Tavern_70px_NoGrid.jpg', 'JPG_70/Tavern_70px_Grid.jpg'],
    );
  });

  it('merges several levels into "<main>_merged"', async () => {
    const result = await convertLevels(
      {
        levels: [
          makeLevel('Castle', PIXELS_PER_GRID),
          makeLevel('Dungeon', PIXELS_PER_GRID),
        ],
        presets: JPG_70,
        variants: ['NoGrid'],
      },
      workDir,
    );

    const files = await collect(result.files);

    assert.equal(result.name, 'Castle_merged');
    assert.deepEqual(
      files.map((file) => file.path),
      [
        'FOUNDRY_VTT_DD2VTT/Castle_merged.dd2vtt',
        'JPG_70/Castle_merged_70px_NoGrid.jpg',
      ],
    );
    const json = JSON.parse(files[0].data.toString('utf8')) as Record<
      string,
      unknown
    >;
    assert.deepEqual(json.environment, { baked_lighting: false });
    assert.equal(typeof json.image, 'string');
  });

  it('rejects a map without a grid when only grid images are wanted', async () => {
    await assert.rejects(
      () =>
        convertLevels(
          {
            levels: [makeLevel('Plain')],
            original,
            presets: JPG_70,
            variants: ['Grid'],
          },
          workDir,
        ),
      (error: unknown) => {
        assert.ok(error instanceof UnprocessableError);
        assert.equal(
          error.message,
          'This map has no grid information, so only "No grid" images can be made.',
        );
        return true;
      },
    );
  });

  it('makes "No grid" images for a map without a grid', async () => {
    const result = await convertLevels(
      { levels: [makeLevel('Plain')], original, presets: JPG_70 },
      workDir,
    );

    const files = await collect(result.files);

    assert.deepEqual(
      files.map((file) => file.path),
      ['FOUNDRY_VTT_DD2VTT/Plain.dd2vtt', 'JPG_70/Plain_70px_NoGrid.jpg'],
    );
  });
});
