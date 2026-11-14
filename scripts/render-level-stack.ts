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
import {
  LOGO_LIMITS,
  MAX_INPUT_PIXELS,
  renderLogo,
} from '../src/features/converter/image-processing/render-map-images.ts';

const OUTPUT_DIR = path.join(
  import.meta.dirname,
  '..',
  'web/src/pages/home/level-stack',
);
const WIDTH = 1280;
const LOGO_FLAG = '--logo';
const WEBP = { quality: 74, alphaQuality: 90 };

function loadLevel(file: string, workDir: string) {
  const name = path.basename(file);

  return readDd2vttStream(name, createReadStream(file), {
    raw: path.join(workDir, `${name}.raw`),
    image: newImagePath(workDir),
  });
}

async function logoOverlay(
  logo: string,
  mapSize: { width: number; height: number },
) {
  return renderLogo(
    {
      image: await fs.readFile(logo),
      size: LOGO_LIMITS.size.default,
      margin: LOGO_LIMITS.margin.default,
    },
    mapSize,
  );
}

async function saveWebp(
  image: string,
  name: string,
  logo?: string,
): Promise<void> {
  const { data, info } = await sharp(image, { limitInputPixels: false })
    .resize({ width: WIDTH })
    .png()
    .toBuffer({ resolveWithObject: true });
  const saved = await sharp(data)
    .composite(logo ? [await logoOverlay(logo, info)] : [])
    .webp(WEBP)
    .toFile(path.join(OUTPUT_DIR, name));

  console.log(
    `✓ ${name} ${saved.width}×${saved.height}, ${Math.round(saved.size / 1024)} KB`,
  );
}

async function renderLitLevels(
  files: string[],
  workDir: string,
  logo?: string,
): Promise<void> {
  for (const [at, file] of files.entries()) {
    const level = await loadLevel(file, workDir);
    const lit = await bakeLighting(level, workDir, MAX_INPUT_PIXELS);

    await saveWebp(
      lit.image,
      `level-${String(at + 1).padStart(2, '0')}.webp`,
      at === 0 ? logo : undefined,
    );
  }
}

async function renderMergedMap(
  files: string[],
  workDir: string,
  logo?: string,
): Promise<void> {
  const topLevelFirst = [];
  for (const file of [...files].reverse()) {
    topLevelFirst.push(await loadLevel(file, workDir));
  }
  const merged = await mergeLevels(topLevelFirst, 'merged.dd2vtt', workDir);

  await saveWebp(merged.map.image, 'merged.webp', logo);
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
  const given = process.argv.slice(2);
  const logo = given[0] === LOGO_FLAG ? given[1] : undefined;
  const files = logo ? given.slice(2) : given;
  if (files.length === 0) {
    console.error(
      'Usage: node scripts/render-level-stack.ts [--logo <image>] <level 1>.dd2vtt <level 2>.dd2vtt … (lowest level first)',
    );
    process.exitCode = 1;
    return;
  }

  await inWorkDir((workDir) => renderLitLevels(files, workDir, logo));
  await inWorkDir((workDir) => renderMergedMap(files, workDir, logo));
}

await main();
