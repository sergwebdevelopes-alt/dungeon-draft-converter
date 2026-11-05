import type { LoadedMap } from '../image-processing/read-dd2vtt-file.ts';

interface Point {
  x: number;
  y: number;
}

interface Resolution {
  origin: Point;
  size: Point | undefined;
  pixelsPerGrid: number | undefined;
}

type RawLight = Record<string, unknown> & { position: Point };

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

function readResolution(level: LoadedMap): Resolution {
  const resolution = record(level.metadata.resolution);
  return {
    origin: readPoint(resolution.map_origin) ?? { x: 0, y: 0 },
    size: readPoint(resolution.map_size),
    pixelsPerGrid: level.pixelsPerGrid,
  };
}

function readRawLights(level: LoadedMap): RawLight[] {
  const lights = level.metadata.lights;
  if (!Array.isArray(lights)) {
    return [];
  }
  return lights.filter(
    (light): light is RawLight =>
      readPoint(record(light).position) !== undefined,
  );
}

export { readPoint, readRawLights, readResolution, record };
export type { Point, RawLight, Resolution };
