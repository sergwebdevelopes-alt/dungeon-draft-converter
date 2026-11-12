import type { ImageName } from '../domain/map-image-keys.ts';

interface RenderedMapImages {
  width: number;
  height: number;
  files: Partial<Record<ImageName, Buffer>>;
}

type RenderMapImages = (
  original: Buffer,
  names: ImageName[],
) => Promise<RenderedMapImages>;

export type { RenderedMapImages, RenderMapImages };
