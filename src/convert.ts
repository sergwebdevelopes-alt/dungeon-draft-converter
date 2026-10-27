import fs from 'fs/promises';
import path from 'path';
import sharp, { type OverlayOptions } from 'sharp';
import { createGridSvg } from './grid.ts';
import { loadDd2vttMaps, type LoadedMap } from './dd2vtt.ts';

const SOURCE_DIR = 'source';
const DIST_DIR = 'dist';
const FOUNDRY_DIR = 'FOUNDRY_VTT_DD2VTT';

const JPEG_QUALITY = 80;
const WEBP_QUALITY = 80;
const MAX_OUTPUT_PIXELS = 200_000_000;
const LOGO_SIZE_RATIO = 0.1;
const LOGO_MARGIN_RATIO = 0.03;

class MapTooLargeError extends Error {
  name = 'MapTooLargeError';
}

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

const VARIANTS = ['NoGrid', 'Grid'] as const;

type Variant = (typeof VARIANTS)[number];

interface ConvertOptions {
  presets?: readonly FormatPreset[];
  variants?: readonly Variant[];
  logo?: Buffer;
}

interface OutputFile {
  path: string;
  data: Buffer;
}

interface Size {
  width: number;
  height: number;
}

async function getImageDimensions(buffer: Buffer): Promise<Size> {
  const { width, height } = await sharp(buffer).metadata();
  if (!width || !height) {
    throw new Error(
      'Could not read image dimensions (width/height missing from metadata).',
    );
  }
  return { width, height };
}

function getOutputSize(
  map: LoadedMap,
  preset: FormatPreset,
  sourceSize: Size,
): Size {
  if (!map.pixelsPerGrid) {
    return sourceSize;
  }

  const scale = preset.ppi / map.pixelsPerGrid;
  const width = Math.round(sourceSize.width * scale);
  const height = Math.round(sourceSize.height * scale);

  if (width * height > MAX_OUTPUT_PIXELS) {
    throw new MapTooLargeError(
      `"${map.fileNameWithExt}" would be ${width}×${height} px in ${preset.name}, which exceeds the ${MAX_OUTPUT_PIXELS / 1_000_000} megapixel limit.`,
    );
  }

  return { width, height };
}

async function renderLogo(
  logo: Buffer,
  mapSize: Size,
): Promise<OverlayOptions> {
  const shorterSide = Math.min(mapSize.width, mapSize.height);
  const box = Math.max(1, Math.round(shorterSide * LOGO_SIZE_RATIO));
  const margin = Math.round(shorterSide * LOGO_MARGIN_RATIO);

  const { data, info } = await sharp(logo)
    .autoOrient()
    .resize(box, box, { fit: 'inside' })
    .png()
    .toBuffer({ resolveWithObject: true });

  return {
    input: data,
    left: mapSize.width - info.width - margin,
    top: mapSize.height - info.height - margin,
  };
}

async function convertImage(options: {
  buffer: Buffer;
  preset: FormatPreset;
  size: Size;
  resize: boolean;
  withGrid: boolean;
  logo?: Buffer;
}): Promise<Buffer> {
  const { buffer, preset, size, resize, withGrid, logo } = options;

  let pipeline = sharp(buffer);
  if (resize) {
    pipeline = pipeline.resize(size.width, size.height);
  }

  const overlays: OverlayOptions[] = [];
  if (withGrid) {
    const gridSvg = createGridSvg(size.width, size.height, preset.ppi);
    overlays.push({ input: Buffer.from(gridSvg), blend: 'over' });
  }
  if (logo) {
    overlays.push(await renderLogo(logo, size));
  }
  if (overlays.length > 0) {
    pipeline = pipeline.composite(overlays);
  }

  pipeline =
    preset.format === 'webp'
      ? pipeline.webp({ quality: WEBP_QUALITY })
      : pipeline.jpeg({ quality: JPEG_QUALITY });

  return pipeline.withMetadata({ density: preset.ppi }).toBuffer();
}

function outputPath(
  map: LoadedMap,
  preset: FormatPreset,
  variant: Variant,
): string {
  return `${preset.name}/${map.fileNameWithoutExt}_${preset.ppi}px_${variant}.${preset.format}`;
}

async function convertMap(
  map: LoadedMap,
  { presets = FORMAT_PRESETS, variants = VARIANTS, logo }: ConvertOptions = {},
): Promise<OutputFile[]> {
  const sourceSize = await getImageDimensions(map.buffer);
  const canDrawGrid = map.pixelsPerGrid !== undefined;
  const availableVariants = canDrawGrid
    ? variants
    : variants.filter((variant) => variant !== 'Grid');

  const jobs = presets.flatMap((preset) => {
    const size = getOutputSize(map, preset, sourceSize);
    const resize =
      size.width !== sourceSize.width || size.height !== sourceSize.height;

    return availableVariants.map((variant) => ({
      preset,
      variant,
      size,
      resize,
    }));
  });

  return Promise.all(
    jobs.map(async ({ preset, variant, size, resize }) => ({
      path: outputPath(map, preset, variant),
      data: await convertImage({
        buffer: map.buffer,
        preset,
        size,
        resize,
        withGrid: variant === 'Grid',
        logo,
      }),
    })),
  );
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

  const files = await convertMap(map);

  await Promise.all(
    files.map(async (file) => {
      const filePath = path.join(mapDir, file.path);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, file.data);
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
  MAX_OUTPUT_PIXELS,
  MapTooLargeError,
  FORMAT_PRESETS,
  VARIANTS,
  getImageDimensions,
  convertImage,
  convertMap,
  processMap,
  run,
};
export type { FormatPreset, Variant, ConvertOptions, OutputFile };
