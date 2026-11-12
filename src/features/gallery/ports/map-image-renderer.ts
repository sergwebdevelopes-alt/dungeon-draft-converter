import type { ImageName } from '../domain/map-image-keys.ts';

type RenderedMapImages = Partial<Record<ImageName, Buffer>>;

type RenderMapImages = (
  original: Buffer,
  names: ImageName[],
) => Promise<RenderedMapImages>;

export type { RenderedMapImages, RenderMapImages };
