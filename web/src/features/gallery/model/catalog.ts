import type {
  MapEntry,
  Squares,
} from '../../../../../src/contracts/gallery-api.ts';

type GriddedMap = MapEntry & { squares: Squares };

function hasSquares(map: MapEntry): map is GriddedMap {
  return map.squares !== undefined;
}

function squaresLabel({ x, y }: Squares): string {
  return `${x} × ${y} squares`;
}

function captionOf(map: MapEntry): string {
  return [map.subtitle, map.squares && squaresLabel(map.squares)]
    .filter(Boolean)
    .join(' · ');
}

function findMap(maps: MapEntry[], slug: string | null): MapEntry | null {
  return maps.find((map) => map.slug === slug) ?? null;
}

function neighbour(
  maps: MapEntry[],
  slug: string,
  step: 1 | -1,
  wrap: boolean,
): MapEntry | null {
  const index = maps.findIndex((map) => map.slug === slug);
  if (index === -1 || maps.length < 2) {
    return null;
  }

  const next = index + step;
  if (wrap) {
    return maps[(next + maps.length) % maps.length];
  }

  return maps[next] ?? null;
}

export { captionOf, findMap, hasSquares, neighbour };
export type { GriddedMap, MapEntry };
