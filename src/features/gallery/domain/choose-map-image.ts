import type { PostImage } from './patreon-post.ts';

const NO_GRID = /no[\s_-]?grid/i;
const GRID = /grid/i;

function fileName(image: PostImage): string {
  return image.fileName ?? '';
}

function isNoGrid(image: PostImage): boolean {
  return NO_GRID.test(fileName(image));
}

function isGridded(image: PostImage): boolean {
  return GRID.test(fileName(image)) && !isNoGrid(image);
}

function chooseCover(images: PostImage[]): PostImage | null {
  return (
    images.find((image) => image.isMain) ??
    images.find(isNoGrid) ??
    images.find((image) => !isGridded(image)) ??
    images[0] ??
    null
  );
}

function chooseImages(images: PostImage[]): PostImage[] {
  const cover = chooseCover(images);
  if (!cover) {
    return [];
  }

  const hasNoGrid = images.some(isNoGrid);
  const others = images.filter(
    (image) => image !== cover && !(hasNoGrid && isGridded(image)),
  );

  return [cover, ...others];
}

export { chooseImages };
