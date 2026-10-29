import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { convertMap, FORMAT_PRESETS, type OutputFile } from '../src/convert.ts';
import type { LoadedMap } from '../src/dd2vtt.ts';

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

async function convertAll(map: LoadedMap, workDir: string) {
  const { files } = await convertMap(map, workDir);
  const result = new Map<string, OutputFile>();
  for await (const file of files) {
    result.set(file.path, file);
  }
  return result;
}

describe('convertMap (integration)', () => {
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
