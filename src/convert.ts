import fs from 'fs/promises';
import sharp, { type OverlayOptions, type Sharp } from 'sharp';
import { createGridSvg, gridTileSquares } from './grid.ts';
import { newImagePath, type LoadedMap, type MapImage } from './dd2vtt.ts';
import { bakeLighting } from './lighting.ts';

const FOUNDRY_DIR = 'FOUNDRY_VTT_DD2VTT';

const JPEG_QUALITY = 80;
const WEBP_QUALITY = 80;
const WEBP_EFFORT = 1;
const MAX_OUTPUT_PIXELS = 250_000_000;
const WEBP_MAX_SIDE = 16383;
const MAX_INPUT_PIXELS = 200_000_000;
const MAX_PARALLEL_IMAGES = Number(process.env.MAX_PARALLEL_IMAGES ?? 2);
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

interface Conversion {
  count: number;
  files: AsyncGenerator<OutputFile>;
}

interface Size {
  width: number;
  height: number;
}

function readMapImage(
  image: MapImage,
  limitInputPixels = MAX_INPUT_PIXELS,
): Sharp {
  return sharp(image, { limitInputPixels });
}

async function readMapImageSize(map: LoadedMap): Promise<Size> {
  let metadata;
  try {
    metadata = await sharp(map.image, { limitInputPixels: false }).metadata();
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

function gridOverlay(size: Size, gridSize: number): OverlayOptions {
  const squares = gridTileSquares(gridSize);
  if (!squares) {
    const svg = createGridSvg(size.width, size.height, gridSize);
    return { input: Buffer.from(svg), blend: 'over' };
  }
  const tile = squares * gridSize;
  return {
    input: Buffer.from(createGridSvg(tile, tile, gridSize)),
    tile: true,
    gravity: 'northwest',
    blend: 'over',
  };
}

async function convertImage(options: {
  image: MapImage;
  preset: FormatPreset;
  size: Size;
  withGrid: boolean;
  logo?: LogoOptions;
}): Promise<Buffer> {
  const { image, preset, size, withGrid, logo } = options;

  let pipeline = readMapImage(image, MAX_OUTPUT_PIXELS);

  const overlays: OverlayOptions[] = [];
  if (withGrid) {
    overlays.push(gridOverlay(size, preset.ppi));
  }
  if (logo) {
    overlays.push(await renderLogo(logo, size));
  }
  if (overlays.length > 0) {
    pipeline = pipeline.composite(overlays);
  }

  pipeline =
    preset.format === 'webp'
      ? pipeline.webp({ quality: WEBP_QUALITY, effort: WEBP_EFFORT })
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

function groupJobs<T extends { size: Size }>(jobs: readonly T[]): T[][] {
  const groups: T[][] = [];
  let currentGroup: T[] = [];
  let currentGroupPixels = 0;

  for (const job of jobs) {
    const jobPixels = job.size.width * job.size.height;

    const exceedsLimits =
      currentGroup.length >= MAX_PARALLEL_IMAGES ||
      currentGroupPixels + jobPixels > MAX_OUTPUT_PIXELS;

    if (exceedsLimits && currentGroup.length > 0) {
      groups.push(currentGroup);
      currentGroup = [];
      currentGroupPixels = 0;
    }

    currentGroup.push(job);
    currentGroupPixels += jobPixels;
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

async function convertMap(
  map: LoadedMap,
  workDir: string,
  { presets = FORMAT_PRESETS, variants = VARIANTS, logo }: ConvertOptions = {},
): Promise<Conversion> {
  if (logo) {
    checkLogoPercent('size', logo.size);
    checkLogoPercent('margin', logo.margin);
  }

  const sourceSize = await readMapImageSize(map);
  const canDrawGrid = map.pixelsPerGrid !== undefined;
  const availableVariants = canDrawGrid
    ? variants
    : variants.filter((variant) => variant !== 'Grid');

  const steps = presets.map((preset) => {
    const size = getOutputSize(map, preset, sourceSize);
    const resize =
      size.width !== sourceSize.width || size.height !== sourceSize.height;
    const jobs = availableVariants.map((variant) => ({
      preset,
      variant,
      size,
    }));
    return { size, resize, jobs };
  });
  const count = steps.length * availableVariants.length;

  async function* convertJobs(
    image: MapImage,
    jobs: (typeof steps)[number]['jobs'],
  ): AsyncGenerator<OutputFile> {
    for (const group of groupJobs(jobs)) {
      const results = await Promise.allSettled(
        group.map(({ preset, variant, size }) =>
          convertImage({
            image,
            preset,
            size,
            withGrid: variant === 'Grid',
            logo,
          }),
        ),
      );
      for (const [i, result] of results.entries()) {
        if (result.status === 'rejected') {
          throw result.reason;
        }
        const { preset, variant } = group[i];
        yield { path: outputPath(map, preset, variant), data: result.value };
      }
    }
  }

  async function* render(): AsyncGenerator<OutputFile> {
    if (count === 0) {
      return;
    }
    const { image } = await bakeLighting(map, workDir, MAX_INPUT_PIXELS);
    const source = newImagePath(workDir, 'v');
    try {
      await readMapImage(image).toFile(source);
      for (const { size, resize, jobs } of steps) {
        const resized = resize ? newImagePath(workDir, 'v') : source;
        try {
          if (resize) {
            await readMapImage(source)
              .resize(size.width, size.height)
              .toFile(resized);
          }
          yield* convertJobs(resized, jobs);
        } finally {
          if (resize) {
            await fs.rm(resized, { force: true });
          }
        }
      }
    } finally {
      await fs.rm(source, { force: true });
    }
  }

  return { count, files: render() };
}

export {
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
};
export type {
  FormatPreset,
  Variant,
  LogoSetting,
  LogoOptions,
  ConvertOptions,
  Conversion,
  OutputFile,
};
