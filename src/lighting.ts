import fs from 'fs/promises';
import sharp, { type Sharp } from 'sharp';
import { newImagePath, type LoadedMap, type MapImage } from './dd2vtt.ts';

const MAX_FIELD_PIXELS = 8_000_000;
const MIN_AMBIENT = 0.05;
const ANGLE_STEPS = 360;
const EDGE_EPSILON = 1e-4;
const LIGHT_BLUR = 0.1;

type Rgb = [number, number, number];

interface Point {
  x: number;
  y: number;
}

type Segment = [Point, Point];

interface Light {
  position: Point;
  range: number;
  intensity: number;
  color: Rgb;
  shadows: boolean;
}

interface FieldGrid {
  width: number;
  height: number;
  origin: Point;
  pixelsPerSquare: number;
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function readPoint(value: unknown): Point | undefined {
  const { x, y } = record(value);
  return typeof x === 'number' &&
    typeof y === 'number' &&
    Number.isFinite(x) &&
    Number.isFinite(y)
    ? { x, y }
    : undefined;
}

function parseColor(value: unknown, fallback: Rgb): Rgb {
  if (
    typeof value !== 'string' ||
    !/^([0-9a-f]{2})?[0-9a-f]{6}$/i.test(value)
  ) {
    return fallback;
  }
  const rgb = value.slice(-6);
  return [0, 2, 4].map((i) => parseInt(rgb.slice(i, i + 2), 16) / 255) as Rgb;
}

function readLights(level: LoadedMap): Light[] {
  const lights = level.metadata.lights;
  if (!Array.isArray(lights)) {
    return [];
  }
  return lights.flatMap((raw) => {
    const light = record(raw);
    const position = readPoint(light.position);
    const range = light.range;
    if (!position || typeof range !== 'number' || !(range > 0)) {
      return [];
    }
    const intensity =
      typeof light.intensity === 'number' && Number.isFinite(light.intensity)
        ? light.intensity
        : 1;
    return [
      {
        position,
        range,
        intensity,
        color: parseColor(light.color, [1, 1, 1]),
        shadows: light.shadows !== false,
      },
    ];
  });
}

function readSegments(level: LoadedMap): Segment[] {
  const segments: Segment[] = [];
  const addPolylines = (value: unknown) => {
    if (!Array.isArray(value)) {
      return;
    }
    for (const line of value) {
      if (!Array.isArray(line)) {
        continue;
      }
      const points = line.map(readPoint);
      for (let i = 1; i < points.length; i++) {
        const [a, b] = [points[i - 1], points[i]];
        if (a && b) {
          segments.push([a, b]);
        }
      }
    }
  };

  addPolylines(level.metadata.line_of_sight);
  addPolylines(level.metadata.objects_line_of_sight);

  const portals = level.metadata.portals;
  if (Array.isArray(portals)) {
    for (const raw of portals) {
      const portal = record(raw);
      const bounds = Array.isArray(portal.bounds) ? portal.bounds : [];
      const [a, b] = [readPoint(bounds[0]), readPoint(bounds[1])];
      if (portal.closed === true && a && b) {
        segments.push([a, b]);
      }
    }
  }
  return segments;
}

function rayHit(origin: Point, dir: Point, [a, b]: Segment): number {
  const ex = b.x - a.x;
  const ey = b.y - a.y;
  const den = dir.x * ey - dir.y * ex;
  if (Math.abs(den) < 1e-12) {
    return Infinity;
  }
  const t = ((a.x - origin.x) * ey - (a.y - origin.y) * ex) / den;
  const u = ((a.x - origin.x) * dir.y - (a.y - origin.y) * dir.x) / den;
  return t > 1e-9 && u >= 0 && u <= 1 ? t : Infinity;
}

function visibilityPolygon(light: Light, segments: Segment[]): Point[] {
  const { position: o, range: r } = light;
  const near = segments.filter(
    ([a, b]) =>
      Math.min(a.x, b.x) <= o.x + r &&
      Math.max(a.x, b.x) >= o.x - r &&
      Math.min(a.y, b.y) <= o.y + r &&
      Math.max(a.y, b.y) >= o.y - r,
  );

  const angles: number[] = [];
  for (let i = 0; i < ANGLE_STEPS; i++) {
    angles.push((i / ANGLE_STEPS) * Math.PI * 2);
  }
  for (const [a, b] of near) {
    for (const p of [a, b]) {
      const angle = Math.atan2(p.y - o.y, p.x - o.x);
      angles.push(angle - EDGE_EPSILON, angle, angle + EDGE_EPSILON);
    }
  }
  angles.sort((x, y) => x - y);

  return angles.map((angle) => {
    const dir = { x: Math.cos(angle), y: Math.sin(angle) };
    let t = r;
    for (const segment of near) {
      t = Math.min(t, rayHit(o, dir, segment));
    }
    return { x: o.x + dir.x * t, y: o.y + dir.y * t };
  });
}

function fieldGrid(
  width: number,
  height: number,
  origin: Point,
  pixelsPerGrid: number,
): FieldGrid {
  const scale = Math.min(1, Math.sqrt(MAX_FIELD_PIXELS / (width * height)));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    origin,
    pixelsPerSquare: pixelsPerGrid * scale,
  };
}

async function renderLightField(
  level: LoadedMap,
  grid: FieldGrid,
): Promise<Float32Array> {
  const field = new Float32Array(grid.width * grid.height * 3);
  const segments = readSegments(level);
  const toField = (p: Point) => ({
    x: (p.x - grid.origin.x) * grid.pixelsPerSquare,
    y: (p.y - grid.origin.y) * grid.pixelsPerSquare,
  });

  for (const light of readLights(level)) {
    const center = toField(light.position);
    const radius = light.range * grid.pixelsPerSquare;
    const blur = LIGHT_BLUR * grid.pixelsPerSquare;
    const reach = radius + 3 * blur;
    const left = Math.max(0, Math.floor(center.x - reach));
    const top = Math.max(0, Math.floor(center.y - reach));
    const right = Math.min(grid.width, Math.ceil(center.x + reach));
    const bottom = Math.min(grid.height, Math.ceil(center.y + reach));
    if (right <= left || bottom <= top) {
      continue;
    }

    const local = (p: Point) => `${p.x - left},${p.y - top}`;
    const shape = light.shadows
      ? `<polygon points="${visibilityPolygon(light, segments)
          .map((p) => local(toField(p)))
          .join(' ')}" fill="url(#g)" filter="url(#b)"/>`
      : `<circle cx="${center.x - left}" cy="${center.y - top}" r="${radius}" fill="url(#g)" filter="url(#b)"/>`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${right - left}" height="${bottom - top}"><defs><radialGradient id="g" gradientUnits="userSpaceOnUse" cx="${center.x - left}" cy="${center.y - top}" r="${radius}"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient><filter id="b" filterUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%"><feGaussianBlur stdDeviation="${blur}"/></filter></defs><rect width="100%" height="100%" fill="#000"/>${shape}</svg>`;

    const { data, info } = await sharp(Buffer.from(svg))
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const [r, g, b] = light.color.map((c) => c * light.intensity);
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const falloff = data[(y * info.width + x) * info.channels] / 255;
        if (falloff > 0) {
          const i = ((top + y) * grid.width + left + x) * 3;
          field[i] += r * falloff;
          field[i + 1] += g * falloff;
          field[i + 2] += b * falloff;
        }
      }
    }
  }
  return field;
}

function ambientLight(level: LoadedMap): Rgb {
  const environment = record(level.metadata.environment);
  return parseColor(environment.ambient_light, [1, 1, 1]).map((c) =>
    Math.max(MIN_AMBIENT, c),
  ) as Rgb;
}

function hasBakedLighting(level: LoadedMap): boolean {
  return record(level.metadata.environment).baked_lighting === true;
}

async function dodgeMask(
  lightBelow: Float32Array,
  added: Float32Array,
  ambient: Rgb,
  grid: FieldGrid,
  width: number,
  height: number,
  workDir: string,
): Promise<MapImage | undefined> {
  const mask = Buffer.alloc(grid.width * grid.height * 3);
  let any = false;
  for (let i = 0; i < mask.length; i++) {
    if (added[i] <= 0) {
      continue;
    }
    const existing = ambient[i % 3] + lightBelow[i];
    mask[i] = Math.round((255 * added[i]) / (existing + added[i]));
    any ||= mask[i] > 0;
  }
  if (!any) {
    return undefined;
  }
  return writeTempImage(
    sharp(mask, {
      raw: { width: grid.width, height: grid.height, channels: 3 },
    }).resize(width, height, { kernel: 'linear' }),
    workDir,
  );
}

async function writeImage(
  pipeline: Sharp,
  workDir: string,
  compressionLevel = 1,
): Promise<MapImage> {
  const file = newImagePath(workDir);
  await pipeline.png({ compressionLevel }).toFile(file);
  return file;
}

async function writeTempImage(
  pipeline: Sharp,
  workDir: string,
): Promise<MapImage> {
  const file = newImagePath(workDir, 'v');
  await pipeline.toFile(file);
  return file;
}

async function removeImages(...files: MapImage[]): Promise<void> {
  await Promise.all(files.map((file) => fs.rm(file, { force: true })));
}

async function relight(
  image: MapImage,
  mask: MapImage,
  workDir: string,
  limitInputPixels: number,
): Promise<MapImage> {
  const alpha = await writeTempImage(
    sharp(image, { limitInputPixels }).ensureAlpha().extractChannel(3),
    workDir,
  );
  const dodged = await writeTempImage(
    sharp(image, { limitInputPixels })
      .ensureAlpha()
      .composite([{ input: mask, blend: 'colour-dodge', limitInputPixels }]),
    workDir,
  );
  const rgb = await writeTempImage(
    sharp(dodged, { limitInputPixels }).removeAlpha(),
    workDir,
  );
  const relit = await writeTempImage(
    sharp(rgb, { limitInputPixels }).joinChannel(alpha),
    workDir,
  );
  await removeImages(mask, alpha, dodged, rgb);
  return relit;
}

async function bakeLighting(
  level: LoadedMap,
  workDir: string,
  limitInputPixels: number,
): Promise<LoadedMap> {
  const pixelsPerGrid = level.pixelsPerGrid;
  if (hasBakedLighting(level) || !pixelsPerGrid) {
    return level;
  }
  const { width, height } = await sharp(level.image, {
    limitInputPixels,
  }).metadata();
  const ambient = ambientLight(level);
  const rgba = await writeTempImage(
    sharp(level.image, { limitInputPixels })
      .toColourspace('srgb')
      .ensureAlpha(),
    workDir,
  );
  const darkened = await writeTempImage(
    sharp(rgba, { limitInputPixels }).linear([...ambient, 1], [0, 0, 0, 0]),
    workDir,
  );
  await removeImages(rgba);

  if (readLights(level).length > 0) {
    const grid = fieldGrid(
      width,
      height,
      readPoint(record(level.metadata.resolution).map_origin) ?? { x: 0, y: 0 },
      pixelsPerGrid,
    );
    const field = await renderLightField(level, grid);
    const mask = await dodgeMask(
      new Float32Array(field.length),
      field,
      ambient,
      grid,
      width,
      height,
      workDir,
    );
    if (mask) {
      const relit = await relight(darkened, mask, workDir, limitInputPixels);
      await removeImages(darkened);
      return withBakedLighting(level, relit);
    }
  }
  return withBakedLighting(level, darkened);
}

function withBakedLighting(level: LoadedMap, image: MapImage): LoadedMap {
  return {
    ...level,
    image,
    metadata: {
      ...level.metadata,
      environment: {
        ...record(level.metadata.environment),
        baked_lighting: true,
      },
    },
  };
}

async function stackLevels(
  levels: readonly LoadedMap[],
  width: number,
  height: number,
  workDir: string,
  limitInputPixels: number,
): Promise<MapImage> {
  const stack = [...levels].reverse();
  const resolution = record(levels[0].metadata.resolution);
  const pixelsPerGrid = levels[0].pixelsPerGrid;
  const grid =
    pixelsPerGrid && levels.every(hasBakedLighting)
      ? fieldGrid(
          width,
          height,
          readPoint(resolution.map_origin) ?? { x: 0, y: 0 },
          pixelsPerGrid,
        )
      : undefined;

  let image = stack[0].image;
  const replace = async (next: MapImage) => {
    if (image !== stack[0].image) {
      await removeImages(image);
    }
    image = next;
  };
  let lightBelow: Float32Array | undefined;

  for (const level of stack.slice(1)) {
    if (grid && readLights(level).length > 0) {
      lightBelow ??= await renderLightField(stack[0], grid);
      const added = await renderLightField(level, grid);
      const mask = await dodgeMask(
        lightBelow,
        added,
        ambientLight(level),
        grid,
        width,
        height,
        workDir,
      );
      if (mask) {
        await replace(await relight(image, mask, workDir, limitInputPixels));
      }
      for (let i = 0; i < added.length; i++) {
        lightBelow[i] += added[i];
      }
    }
    const stacked = sharp(image, { limitInputPixels }).composite([
      { input: level.image, blend: 'over', limitInputPixels },
    ]);
    await replace(
      level === levels[0]
        ? await writeImage(stacked, workDir, 6)
        : await writeTempImage(stacked, workDir),
    );
  }
  return image;
}

export { bakeLighting, hasBakedLighting, stackLevels };
