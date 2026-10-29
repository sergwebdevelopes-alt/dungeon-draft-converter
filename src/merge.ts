import path from 'path';
import sharp from 'sharp';
import type { LoadedMap } from './dd2vtt.ts';
import { MAX_INPUT_PIXELS, readMapImageSize } from './convert.ts';
import { bakeLighting, hasBakedLighting, stackLevels } from './lighting.ts';

const COVERED_ALPHA = 128;

class LevelMismatchError extends Error {
  name = 'LevelMismatchError';
}

interface Point {
  x: number;
  y: number;
}

interface Light {
  position: Point;
  [key: string]: unknown;
}

interface Resolution {
  origin: Point;
  size: Point | undefined;
  pixelsPerGrid: number | undefined;
}

interface MergedLevels {
  map: LoadedMap;
  dd2vtt: Buffer;
  lights: { main: number; added: number; dropped: number };
}

function isPoint(value: unknown): value is Point {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { x, y } = value as Record<string, unknown>;
  return (
    typeof x === 'number' &&
    typeof y === 'number' &&
    Number.isFinite(x) &&
    Number.isFinite(y)
  );
}

function readResolution(level: LoadedMap): Resolution {
  const resolution = level.metadata.resolution;
  const fields =
    typeof resolution === 'object' && resolution !== null
      ? (resolution as Record<string, unknown>)
      : {};
  return {
    origin: isPoint(fields.map_origin) ? fields.map_origin : { x: 0, y: 0 },
    size: isPoint(fields.map_size) ? fields.map_size : undefined,
    pixelsPerGrid: level.pixelsPerGrid,
  };
}

function readLights(level: LoadedMap): Light[] {
  const lights = level.metadata.lights;
  if (!Array.isArray(lights)) {
    return [];
  }
  return lights.filter(
    (light): light is Light =>
      typeof light === 'object' &&
      light !== null &&
      isPoint((light as Record<string, unknown>).position),
  );
}

function sameResolution(a: Resolution, b: Resolution): boolean {
  return (
    a.origin.x === b.origin.x &&
    a.origin.y === b.origin.y &&
    a.size?.x === b.size?.x &&
    a.size?.y === b.size?.y &&
    a.pixelsPerGrid === b.pixelsPerGrid
  );
}

function toPixel(
  position: Point,
  { origin, pixelsPerGrid }: Resolution,
  width: number,
  height: number,
): number | undefined {
  if (!pixelsPerGrid) {
    return undefined;
  }
  const x = Math.floor((position.x - origin.x) * pixelsPerGrid);
  const y = Math.floor((position.y - origin.y) * pixelsPerGrid);
  if (x < 0 || y < 0 || x >= width || y >= height) {
    return undefined;
  }
  return y * width + x;
}

async function readAlpha(level: LoadedMap): Promise<Buffer> {
  return sharp(level.buffer, { limitInputPixels: MAX_INPUT_PIXELS })
    .ensureAlpha()
    .extractChannel(3)
    .raw()
    .toBuffer();
}

async function checkLevelsMatch(
  levels: readonly LoadedMap[],
): Promise<{ width: number; height: number }> {
  const [main, ...lower] = levels;
  const mainSize = await readMapImageSize(main);
  const mainResolution = readResolution(main);

  for (const level of lower) {
    const size = await readMapImageSize(level);
    if (size.width !== mainSize.width || size.height !== mainSize.height) {
      throw new LevelMismatchError(
        `"${level.fileNameWithExt}" is ${size.width}×${size.height} px, but the main map "${main.fileNameWithExt}" is ${mainSize.width}×${mainSize.height} px.`,
      );
    }
    if (!sameResolution(readResolution(level), mainResolution)) {
      throw new LevelMismatchError(
        `"${level.fileNameWithExt}" has a different grid (origin, size or pixels per square) than the main map "${main.fileNameWithExt}".`,
      );
    }
  }

  return mainSize;
}

async function mergeLights(
  levels: readonly LoadedMap[],
  width: number,
  height: number,
): Promise<{ lights: Light[]; added: number; dropped: number }> {
  const resolution = readResolution(levels[0]);
  const candidates = levels.map((level) =>
    readLights(level).map((light) => ({
      light,
      pixel: toPixel(light.position, resolution, width, height),
      covered: false,
    })),
  );

  for (let above = 0; above < levels.length - 1; above++) {
    const below = candidates.slice(above + 1).flat();
    if (!below.some((c) => !c.covered && c.pixel !== undefined)) {
      continue;
    }
    const alpha = await readAlpha(levels[above]);
    for (const candidate of below) {
      if (
        candidate.pixel !== undefined &&
        alpha[candidate.pixel] >= COVERED_ALPHA
      ) {
        candidate.covered = true;
      }
    }
  }

  const visibleBelow = candidates
    .slice(1)
    .flat()
    .filter((c) => !c.covered);
  const totalBelow = candidates.slice(1).flat().length;

  return {
    lights: [...readLights(levels[0]), ...visibleBelow.map((c) => c.light)],
    added: visibleBelow.length,
    dropped: totalBelow - visibleBelow.length,
  };
}

async function mergeLevels(
  levels: readonly LoadedMap[],
  fileName: string,
): Promise<MergedLevels> {
  if (levels.length < 2) {
    throw new Error('Merging needs a main map and at least one level below.');
  }

  const [main] = levels;
  const { width, height } = await checkLevelsMatch(levels);

  const image = await stackLevels(levels, width, height, MAX_INPUT_PIXELS);
  const baked = levels.every(hasBakedLighting);
  const litLevels: LoadedMap[] = [];
  if (!baked) {
    for (const level of levels) {
      litLevels.push(await bakeLighting(level, MAX_INPUT_PIXELS));
    }
  }
  const litImage = baked
    ? image
    : await stackLevels(litLevels, width, height, MAX_INPUT_PIXELS);

  const { lights, added, dropped } = await mergeLights(levels, width, height);
  const environment = {
    ...(main.metadata.environment as Record<string, unknown> | undefined),
    baked_lighting: baked,
  };
  const metadata = { ...main.metadata, environment, lights };
  const dd2vtt = Buffer.from(
    JSON.stringify({ ...metadata, image: image.toString('base64') }),
  );

  return {
    map: {
      fileNameWithExt: fileName,
      fileNameWithoutExt: path.parse(fileName).name,
      buffer: litImage,
      pixelsPerGrid: main.pixelsPerGrid,
      metadata: {
        ...metadata,
        environment: { ...environment, baked_lighting: true },
      },
    },
    dd2vtt,
    lights: { main: lights.length - added, added, dropped },
  };
}

export { LevelMismatchError, mergeLevels };
export type { MergedLevels };
