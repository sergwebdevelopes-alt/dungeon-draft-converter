import type { MapEntry } from '../../../../../src/gallery/model/map-entry.ts';
import type { Squares } from '../../../../../src/gallery/model/types.ts';

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

function filterMaps(maps: MapEntry[], tag: string | null): MapEntry[] {
  return tag ? maps.filter((map) => map.tags.includes(tag)) : maps;
}

function tagsOf(maps: MapEntry[]): string[] {
  return [...new Set(maps.flatMap((map) => map.tags))];
}

function neighbour(
  maps: MapEntry[],
  slug: string,
  step: 1 | -1,
): MapEntry | null {
  const index = maps.findIndex((map) => map.slug === slug);
  if (index === -1 || maps.length < 2) {
    return null;
  }

  return maps[(index + step + maps.length) % maps.length];
}

export { captionOf, filterMaps, findMap, hasSquares, neighbour, tagsOf };
export type { GriddedMap, MapEntry };
