import fs from 'fs/promises';
import path from 'path';
import sharp, { type OverlayOptions, type Sharp } from 'sharp';
import { createGridSvg } from './grid.ts';
import { loadDd2vttMaps, type LoadedMap } from './dd2vtt.ts';
import { bakeLighting } from './lighting.ts';

const SOURCE_DIR = 'source';
const DIST_DIR = 'dist';
const FOUNDRY_DIR = 'FOUNDRY_VTT_DD2VTT';

const JPEG_QUALITY = 80;
const WEBP_QUALITY = 80;
const MAX_OUTPUT_PIXELS = 250_000_000;
const WEBP_MAX_SIDE = 16383;
const MAX_INPUT_PIXELS = 200_000_000;
const MAP_IMAGE_FORMATS = new Set(['png', 'jpeg', 'webp']);

const LOGO_LIMITS = {
  size: { min: 2, max: 20, step: 1, default: 10 },
  margin: { min: 0, max: 5, step: 0.5, default: 3 },
} as const;

type LogoSetting = keyof typeof LOGO_LIMITS;

class MapTooLargeError extends Error {
  name = 'MapTooLargeError';
}

class InvalidLogoPlacementError extends Error {
  name = 'InvalidLogoPlacementError';
}

class InvalidMapImageError extends Error {
  name = 'InvalidMapImageError';
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

interface LogoOptions {
  image: Buffer;
  size: number;
  margin: number;
}

interface ConvertOptions {
  presets?: readonly FormatPreset[];
  variants?: readonly Variant[];
  logo?: LogoOptions;
}

interface OutputFile {
  path: string;
  data: Buffer;
}

interface Size {
  width: number;
  height: number;
}

function readMapImage(buffer: Buffer): Sharp {
  return sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS });
}

async function readMapImageSize(map: LoadedMap): Promise<Size> {
  let metadata;
  try {
    metadata = await sharp(map.buffer, { limitInputPixels: false }).metadata();
  } catch {
    throw new InvalidMapImageError(
      `The image in "${map.fileNameWithExt}" could not be read.`,
    );
  }

  const { format, width, height } = metadata;
  if (!MAP_IMAGE_FORMATS.has(format)) {
    throw new InvalidMapImageError(
      `The image in "${map.fileNameWithExt}" must be PNG, JPG or WebP, got ${format.toUpperCase()}.`,
    );
  }
  if (!width || !height) {
    throw new InvalidMapImageError(
      `The image in "${map.fileNameWithExt}" has no dimensions.`,
    );
  }
  if (width * height > MAX_INPUT_PIXELS) {
    throw new InvalidMapImageError(
      `The image in "${map.fileNameWithExt}" is ${width}×${height} px, which exceeds the ${MAX_INPUT_PIXELS / 1_000_000} megapixel limit.`,
    );
  }

  return { width, height };
}

function getOutputSize(
  map: LoadedMap,
  preset: FormatPreset,
  sourceSize: Size,
): Size {
  const scale = map.pixelsPerGrid ? preset.ppi / map.pixelsPerGrid : 1;
  const width = Math.round(sourceSize.width * scale);
  const height = Math.round(sourceSize.height * scale);

  if (width * height > MAX_OUTPUT_PIXELS) {
    throw new MapTooLargeError(
      `"${map.fileNameWithExt}" would be ${width}×${height} px in ${preset.name}, which exceeds the ${MAX_OUTPUT_PIXELS / 1_000_000} megapixel limit.`,
    );
  }
  if (preset.format === 'webp' && Math.max(width, height) > WEBP_MAX_SIDE) {
    throw new MapTooLargeError(
      `"${map.fileNameWithExt}" would be ${width}×${height} px in ${preset.name}, but WebP images can't be wider or taller than ${WEBP_MAX_SIDE} px.`,
    );
  }

  return { width, height };
}

function checkLogoPercent(setting: LogoSetting, value: number): void {
  const { min, max } = LOGO_LIMITS[setting];
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new InvalidLogoPlacementError(
      `Logo ${setting} must be a number between ${min}% and ${max}%.`,
    );
  }
}

async function renderLogo(
  logo: LogoOptions,
  mapSize: Size,
): Promise<OverlayOptions> {
  const shorterSide = Math.min(mapSize.width, mapSize.height);
  const box = Math.max(1, Math.round((shorterSide * logo.size) / 100));
  const margin = Math.round((shorterSide * logo.margin) / 100);

  const { data, info } = await sharp(logo.image)
    .autoOrient()
    .resize(box, box, { fit: 'inside' })
    .png()
    .toBuffer({ resolveWithObject: true });

  return {
    input: data,
    left: Math.max(0, mapSize.width - info.width - margin),
    top: Math.max(0, mapSize.height - info.height - margin),
  };
}

async function convertImage(options: {
  buffer: Buffer;
  preset: FormatPreset;
  size: Size;
  resize: boolean;
  withGrid: boolean;
  logo?: LogoOptions;
}): Promise<Buffer> {
  const { buffer, preset, size, resize, withGrid, logo } = options;

  let pipeline = readMapImage(buffer);
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
  if (logo) {
    checkLogoPercent('size', logo.size);
    checkLogoPercent('margin', logo.margin);
  }

  const sourceSize = await readMapImageSize(map);
  const { buffer } = await bakeLighting(map, MAX_INPUT_PIXELS);
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

  const files: OutputFile[] = [];
  for (const { preset, variant, size, resize } of jobs) {
    files.push({
      path: outputPath(map, preset, variant),
      data: await convertImage({
        buffer,
        preset,
        size,
        resize,
        withGrid: variant === 'Grid',
        logo,
      }),
    });
  }
  return files;
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
  MAX_INPUT_PIXELS,
  LOGO_LIMITS,
  MapTooLargeError,
  InvalidLogoPlacementError,
  InvalidMapImageError,
  checkLogoPercent,
  FORMAT_PRESETS,
  VARIANTS,
  readMapImageSize,
  convertImage,
  convertMap,
  processMap,
  run,
};
export type {
  FormatPreset,
  Variant,
  LogoSetting,
  LogoOptions,
  ConvertOptions,
  OutputFile,
};
