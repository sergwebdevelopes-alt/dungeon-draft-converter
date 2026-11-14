import type {
  CollectionLink,
  MapEntry,
  Squares,
} from '@contracts/gallery-api.ts';

interface Picture {
  view: string;
  thumb?: string;
  width: number;
  height: number;
}

const GRID_RATIO_TOLERANCE = 0.01;

function squaresLabel({ x, y }: Squares): string {
  return `${x} × ${y} squares`;
}

function mapCaption(map: MapEntry): string {
  return [map.subtitle, map.squares && squaresLabel(map.squares)]
    .filter(Boolean)
    .join(' · ');
}

function findMap(maps: MapEntry[], slug: string | null): MapEntry | null {
  return maps.find((map) => map.slug === slug) ?? null;
}

function collectionAt(
  collections: CollectionLink[],
  slug: string | null | undefined,
): CollectionLink | null {
  return (
    collections.find((collection) => collection.path.endsWith(`/${slug}`)) ??
    null
  );
}

function mapPictures(map: MapEntry): Picture[] {
  return (
    map.pictures ?? [
      { view: map.images.view, width: map.width, height: map.height },
    ]
  );
}

function picturesLabel(map: MapEntry): string | null {
  const count = map.pictures?.length ?? 1;

  return count > 1 ? `${count} levels` : null;
}

function wrapIndex(position: number, count: number): number {
  return ((position % count) + count) % count;
}

function gridFits(picture: Picture, squares: Squares): boolean {
  const pictureRatio = picture.width / picture.height;
  const gridRatio = squares.x / squares.y;

  return Math.abs(pictureRatio - gridRatio) / gridRatio < GRID_RATIO_TOLERANCE;
}

export {
  collectionAt,
  mapCaption,
  findMap,
  gridFits,
  picturesLabel,
  squaresLabel,
  mapPictures,
  wrapIndex,
};
export type { MapEntry, Picture };
