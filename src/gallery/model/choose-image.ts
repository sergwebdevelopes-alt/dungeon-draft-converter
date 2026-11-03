import type { PostImage } from '../patreon/post-details.ts';

const NO_GRID = /no[\s_-]?grid/i;
const GRID = /grid/i;

function fileName(image: PostImage): string {
  return image.fileName ?? '';
}

function chooseImage(images: PostImage[]): PostImage | null {
  return (
    images.find((image) => image.isMain) ??
    images.find((image) => NO_GRID.test(fileName(image))) ??
    images.find((image) => !GRID.test(fileName(image))) ??
    images[0] ??
    null
  );
}

export { chooseImage };
