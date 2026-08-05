import fs from 'fs/promises';
import path from 'path';
import sharp, { type OutputInfo } from 'sharp';
import { createGridSvg } from './grid.ts';
import { loadDd2vttMaps, type LoadedMap } from './dd2vtt.ts';

const SOURCE_DIR = 'source';
const DIST_DIR = 'dist';
const FOUNDRY_DIR = 'FOUNDRY_VTT_DD2VTT';

const JPEG_QUALITY = 80;
const WEBP_QUALITY = 80;

interface FormatPreset {
  name: string;
  ppi: number;
  format: 'jpg' | 'webp';
}

const FORMAT_PRESETS: readonly FormatPreset[] = [
  { name: 'JPG_70', ppi: 70, format: 'jpg' },
  { name: 'JPG_140', ppi: 140, format: 'jpg' },
  { name: 'JPG_300', ppi: 300, format: 'jpg' },
  { name: 'WEBP_140', ppi: 140, format: 'webp' },
] as const;

async function getImageDimensions(
  buffer: Buffer,
): Promise<{ width: number; height: number }> {
  const { width, height } = await sharp(buffer).metadata();
  if (!width || !height) {
    throw new Error(
      'Could not read image dimensions (width/height missing from metadata).',
    );
  }
  return { width, height };
}

async function convertImage(options: {
  outDir: string;
  fileNameWithoutExt: string;
  buffer: Buffer;
  preset: FormatPreset;
  resize?: { width: number; height: number };
  gridSvg?: string;
}): Promise<OutputInfo> {
  const { outDir, fileNameWithoutExt, buffer, preset, resize, gridSvg } =
    options;

  let pipeline = sharp(buffer);
  if (resize) {
    pipeline = pipeline.resize(resize.width, resize.height);
  }
  if (gridSvg) {
    pipeline = pipeline.composite([
      { input: Buffer.from(gridSvg), blend: 'over' },
    ]);
  }
  pipeline =
    preset.format === 'webp'
      ? pipeline.webp({ quality: WEBP_QUALITY })
      : pipeline.jpeg({ quality: JPEG_QUALITY });

  const suffix = gridSvg ? 'Grid' : 'NoGrid';
  const fileName = `${fileNameWithoutExt}_${preset.ppi}px_${suffix}.${preset.format}`;

  return pipeline
    .withMetadata({ density: preset.ppi })
    .toFile(path.join(outDir, fileName));
}

async function processMap(
  map: LoadedMap,
  sourceDir: string,
  distDir: string,
): Promise<void> {
  const mapDir = path.join(distDir, map.fileNameWithoutExt);
  const foundryDir = path.join(mapDir, FOUNDRY_DIR);

  await fs.mkdir(foundryDir, { recursive: true });
  await fs.copyFile(
    path.join(sourceDir, map.fileNameWithExt),
    path.join(foundryDir, map.fileNameWithExt),
  );

  const sourceDims = map.pixelsPerGrid
    ? await getImageDimensions(map.buffer)
    : undefined;

  await Promise.all(
    FORMAT_PRESETS.map(async (preset) => {
      const outDir = path.join(mapDir, preset.name);
      await fs.mkdir(outDir, { recursive: true });

      let resize: { width: number; height: number } | undefined;
      let gridSvg: string | undefined;

      if (map.pixelsPerGrid && sourceDims) {
        const scale = preset.ppi / map.pixelsPerGrid;
        const width = Math.round(sourceDims.width * scale);
        const height = Math.round(sourceDims.height * scale);

        if (scale !== 1) {
          resize = { width, height };
        }

        gridSvg = createGridSvg(width, height, preset.ppi);
      }

      await Promise.all([
        convertImage({
          outDir,
          fileNameWithoutExt: map.fileNameWithoutExt,
          buffer: map.buffer,
          preset,
          resize,
        }),
        ...(gridSvg
          ? [
              convertImage({
                outDir,
                fileNameWithoutExt: map.fileNameWithoutExt,
                buffer: map.buffer,
                preset,
                resize,
                gridSvg,
              }),
            ]
          : []),
      ]);
    }),
  );
}

async function run(sourceDir = SOURCE_DIR, distDir = DIST_DIR): Promise<void> {
  const maps = await loadDd2vttMaps(sourceDir);

  await fs.rm(distDir, { recursive: true, force: true });
  await fs.mkdir(distDir, { recursive: true });

  const failures: { name: string; error: unknown }[] = [];

  for (const map of maps) {
    try {
      await processMap(map, sourceDir, distDir);
      console.log(`✓ ${map.fileNameWithoutExt}`);
    } catch (error) {
      failures.push({ name: map.fileNameWithoutExt, error });
      console.error(`✗ ${map.fileNameWithoutExt}:`, error);
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `${failures.length} of ${maps.length} map(s) failed to convert: ${failures
        .map((f) => f.name)
        .join(', ')}`,
    );
  }
}

export {
  SOURCE_DIR,
  DIST_DIR,
  FOUNDRY_DIR,
  JPEG_QUALITY,
  WEBP_QUALITY,
  FORMAT_PRESETS,
  getImageDimensions,
  convertImage,
  processMap,
  run,
};
export type { FormatPreset };
