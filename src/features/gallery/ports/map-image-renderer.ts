interface GalleryImages {
  card: Buffer;
  view: Buffer;
  backdrop: Buffer;
}

type RenderMapImages = (original: Buffer) => Promise<GalleryImages>;

export type { GalleryImages, RenderMapImages };
