import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { FORMAT_PRESETS, run } from '../src/convert.ts';

async function makeTinyPng(): Promise<Buffer> {
  return sharp({
    create: {
      width: 10,
      height: 10,
      channels: 3,
      background: { r: 200, g: 40, b: 40 },
    },
  })
    .png()
    .toBuffer();
}

function makeDd2vtt(png: Buffer, pixelsPerGrid?: number): string {
  return JSON.stringify({
    format: 0.3,
    ...(pixelsPerGrid
      ? { resolution: { pixels_per_grid: pixelsPerGrid } }
      : {}),
    image: png.toString('base64'),
  });
}

describe('run (integration)', () => {
  let tmpDir: string;
  let sourceDir: string;
  let distDir: string;

  before(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dd2vtt-test-'));
    sourceDir = path.join(tmpDir, 'source');
    distDir = path.join(tmpDir, 'dist');
    await fs.mkdir(sourceDir);

    const png = await makeTinyPng();
    await fs.writeFile(
      path.join(sourceDir, 'TinyMap.DD2VTT'),
      makeDd2vtt(png, 5),
    );
    await fs.writeFile(path.join(sourceDir, 'nogrid.dd2vtt'), makeDd2vtt(png));

    await run(sourceDir, distDir);
  });

  after(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('copies the original file preserving its exact name', async () => {
    await fs.access(
      path.join(distDir, 'TinyMap', 'FOUNDRY_VTT_DD2VTT', 'TinyMap.DD2VTT'),
    );
  });

  it('produces NoGrid and Grid variants for every preset when a grid exists', async () => {
    for (const preset of FORMAT_PRESETS) {
      const dir = path.join(distDir, 'TinyMap', preset.name);
      await fs.access(
        path.join(dir, `TinyMap_${preset.ppi}px_NoGrid.${preset.format}`),
      );
      await fs.access(
        path.join(dir, `TinyMap_${preset.ppi}px_Grid.${preset.format}`),
      );
    }
  });

  it('produces only NoGrid variants when pixels_per_grid is absent', async () => {
    for (const preset of FORMAT_PRESETS) {
      const dir = path.join(distDir, 'nogrid', preset.name);
      const files = await fs.readdir(dir);
      assert.deepEqual(files.sort(), [
        `nogrid_${preset.ppi}px_NoGrid.${preset.format}`,
      ]);
    }
  });

  it('resizes each preset so a grid square measures ppi pixels', async () => {
    for (const preset of FORMAT_PRESETS) {
      for (const variant of ['NoGrid', 'Grid']) {
        const meta = await sharp(
          path.join(
            distDir,
            'TinyMap',
            preset.name,
            `TinyMap_${preset.ppi}px_${variant}.${preset.format}`,
          ),
        ).metadata();
        assert.equal(meta.width, 2 * preset.ppi);
        assert.equal(meta.height, 2 * preset.ppi);
      }
    }
  });

  it('carries the preset DPI tag', async () => {
    const jpg = await sharp(
      path.join(distDir, 'TinyMap', 'JPG_300', 'TinyMap_300px_NoGrid.jpg'),
    ).metadata();
    assert.equal(jpg.density, 300);
  });

  it('keeps native dimensions when pixels_per_grid is absent', async () => {
    const jpg = await sharp(
      path.join(distDir, 'nogrid', 'JPG_300', 'nogrid_300px_NoGrid.jpg'),
    ).metadata();
    assert.equal(jpg.width, 10);
    assert.equal(jpg.height, 10);
    assert.equal(jpg.density, 300);
  });

  it('reports failure instead of succeeding when a file is broken', async () => {
    const badTmp = await fs.mkdtemp(path.join(os.tmpdir(), 'dd2vtt-bad-'));
    const badSource = path.join(badTmp, 'source');
    await fs.mkdir(badSource);
    await fs.writeFile(path.join(badSource, 'broken.dd2vtt'), 'not json');

    await assert.rejects(run(badSource, path.join(badTmp, 'dist')));
    await fs.rm(badTmp, { recursive: true, force: true });
  });
});
