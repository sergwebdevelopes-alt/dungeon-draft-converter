import type { MapRecord } from './types.ts';

function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function oldestFirst(a: MapRecord, b: MapRecord): number {
  return (
    a.publishedAt.localeCompare(b.publishedAt) ||
    a.postId.localeCompare(b.postId)
  );
}

function withUniqueSlugs(maps: MapRecord[]): MapRecord[] {
  const taken = new Set<string>();
  const slugs = new Map<string, string>();

  for (const map of [...maps].sort(oldestFirst)) {
    const slug =
      map.slug && !taken.has(map.slug)
        ? map.slug
        : `${map.slug || 'map'}-${map.postId}`;
    taken.add(slug);
    slugs.set(map.postId, slug);
  }

  return maps.map((map) => ({
    ...map,
    slug: slugs.get(map.postId) ?? map.slug,
  }));
}

export { slugify, withUniqueSlugs };
