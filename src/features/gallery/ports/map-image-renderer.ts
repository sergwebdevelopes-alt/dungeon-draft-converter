interface RenderedMapImages {
  card: Buffer;
  view: Buffer;
  backdrop: Buffer;
}

type RenderMapImages = (original: Buffer) => Promise<RenderedMapImages>;

export type { RenderedMapImages, RenderMapImages };
