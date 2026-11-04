interface MapEntry {
  slug: string;
  title: string;
  subtitle: string;
  squares: { x: number; y: number };
  tags: string[];
  patreonUrl: string;
}

interface ManifestEntry extends MapEntry {
  sources: { noGrid: string };
}

interface Catalog {
  maps: MapEntry[];
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type Fields = Record<string, unknown>;

function fail(where: string, problem: string): never {
  throw new Error(`maps.json: ${where} ${problem}`);
}

function isObject(value: unknown): value is Fields {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(fields: Fields, key: string, where: string): string {
  const value = fields[key];
  if (typeof value !== 'string' || value.trim() === '') {
    fail(where, `needs a "${key}" text`);
  }

  return value;
}

function squares(fields: Fields, where: string): MapEntry['squares'] {
  const value = fields.squares;
  const valid =
    isObject(value) &&
    Number.isInteger(value.x) &&
    Number.isInteger(value.y) &&
    (value.x as number) > 0 &&
    (value.y as number) > 0;
  if (!valid) {
    fail(where, 'needs "squares" with whole numbers x and y above 0');
  }

  return { x: value.x as number, y: value.y as number };
}

function tags(fields: Fields, where: string): string[] {
  const value = fields.tags;
  const valid =
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((tag) => typeof tag === 'string' && tag.trim() !== '');
  if (!valid) {
    fail(where, 'needs at least one tag');
  }

  return value as string[];
}

function sources(fields: Fields, where: string): ManifestEntry['sources'] {
  const value = fields.sources;
  if (!isObject(value)) {
    fail(where, 'needs "sources" with a "noGrid" path');
  }

  return {
    noGrid: text(value, 'noGrid', `${where} sources`),
  };
}

function patreonUrl(fields: Fields, where: string): string {
  const value = text(fields, 'patreonUrl', where);
  if (!value.startsWith('https://')) {
    fail(where, 'needs a "patreonUrl" starting with https://');
  }

  return value;
}

function parseEntry(raw: unknown, index: number): ManifestEntry {
  const where = `map ${index + 1}`;
  if (!isObject(raw)) {
    fail(where, 'is not an object');
  }

  const slug = text(raw, 'slug', where);
  if (!SLUG.test(slug)) {
    fail(where, `has slug "${slug}"; use lowercase letters, digits and dashes`);
  }

  const named = `map "${slug}"`;
  return {
    slug,
    title: text(raw, 'title', named),
    subtitle: text(raw, 'subtitle', named),
    squares: squares(raw, named),
    tags: tags(raw, named),
    patreonUrl: patreonUrl(raw, named),
    sources: sources(raw, named),
  };
}

function parseManifest(raw: unknown): ManifestEntry[] {
  if (!isObject(raw) || !Array.isArray(raw.maps)) {
    fail('file', 'needs a "maps" list');
  }

  const entries = raw.maps.map(parseEntry);
  const seen = new Set<string>();
  for (const { slug } of entries) {
    if (seen.has(slug)) {
      fail(`map "${slug}"`, 'appears twice');
    }
    seen.add(slug);
  }

  return entries;
}

function toCatalog(entries: ManifestEntry[]): Catalog {
  return {
    maps: entries.map(
      ({ slug, title, subtitle, squares, tags, patreonUrl }) => ({
        slug,
        title,
        subtitle,
        squares,
        tags,
        patreonUrl,
      }),
    ),
  };
}

export { parseManifest, toCatalog };
export type { Catalog, ManifestEntry };
