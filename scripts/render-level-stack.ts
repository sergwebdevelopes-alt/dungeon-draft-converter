import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { bakeLighting } from '../src/features/converter/image-processing/bake-lighting.ts';
import { mergeLevels } from '../src/features/converter/image-processing/merge-levels.ts';
import {
  newImagePath,
  readDd2vttStream,
} from '../src/features/converter/image-processing/read-dd2vtt-file.ts';
import { MAX_INPUT_PIXELS } from '../src/features/converter/image-processing/render-map-images.ts';

const OUTPUT_DIR = path.join(
  import.meta.dirname,
  '..',
  'web/src/pages/home/level-stack',
);
const WIDTH = 1280;
const WEBP = { quality: 74, alphaQuality: 90 };

function loadLevel(file: string, workDir: string) {
  const name = path.basename(file);

  return readDd2vttStream(name, createReadStream(file), {
    raw: path.join(workDir, `${name}.raw`),
    image: newImagePath(workDir),
  });
}

async function saveWebp(image: string, name: string): Promise<void> {
  const saved = await sharp(image, { limitInputPixels: false })
    .resize({ width: WIDTH })
    .webp(WEBP)
    .toFile(path.join(OUTPUT_DIR, name));

  console.log(
    `✓ ${name} ${saved.width}×${saved.height}, ${Math.round(saved.size / 1024)} KB`,
  );
}

async function renderLitLevels(
  files: string[],
  workDir: string,
): Promise<void> {
  for (const [at, file] of files.entries()) {
    const level = await loadLevel(file, workDir);
    const lit = await bakeLighting(level, workDir, MAX_INPUT_PIXELS);

    await saveWebp(lit.image, `level-${String(at + 1).padStart(2, '0')}.webp`);
  }
}

async function renderMergedMap(
  files: string[],
  workDir: string,
): Promise<void> {
  const topLevelFirst = [];
  for (const file of [...files].reverse()) {
    topLevelFirst.push(await loadLevel(file, workDir));
  }
  const merged = await mergeLevels(topLevelFirst, 'merged.dd2vtt', workDir);

  await saveWebp(merged.map.image, 'merged.webp');
}

async function inWorkDir(
  render: (workDir: string) => Promise<void>,
): Promise<void> {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'level-stack-'));
  try {
    await render(workDir);
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error(
      'Usage: node scripts/render-level-stack.ts <level 1>.dd2vtt <level 2>.dd2vtt … (lowest level first)',
    );
    process.exitCode = 1;
    return;
  }

  await inWorkDir((workDir) => renderLitLevels(files, workDir));
  await inWorkDir((workDir) => renderMergedMap(files, workDir));
}

await main();
