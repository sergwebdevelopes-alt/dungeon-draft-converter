interface MapEntry {
  slug: string;
  title: string;
  subtitle: string;
  squares: { x: number; y: number };
  tags: string[];
  patreonUrl: string;
}

interface MapImages {
  card: string;
  view: string;
  viewGrid: string;
  backdrop: string;
}

function mapImages(slug: string): MapImages {
  const base = `/maps/${slug}`;

  return {
    card: `${base}/card.webp`,
    view: `${base}/view.webp`,
    viewGrid: `${base}/view-grid.webp`,
    backdrop: `${base}/backdrop.webp`,
  };
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

export { filterMaps, findMap, mapImages, neighbour, tagsOf };
export type { MapEntry, MapImages };
