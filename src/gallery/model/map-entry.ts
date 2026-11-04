import { imageKey, type ImageName } from './image-keys.ts';
import type { MapRecord, Squares } from './types.ts';

interface MapEntry {
  slug: string;
  title: string;
  subtitle?: string;
  tags: string[];
  squares?: Squares;
  width: number;
  height: number;
  patreonUrl: string;
  images: Record<ImageName, string>;
}

function imageUrls(
  map: MapRecord,
  urlFor: (key: string) => string,
): Record<ImageName, string> {
  return {
    card: urlFor(imageKey(map, 'card')),
    view: urlFor(imageKey(map, 'view')),
    backdrop: urlFor(imageKey(map, 'backdrop')),
  };
}

function toMapEntry(map: MapRecord, urlFor: (key: string) => string): MapEntry {
  return {
    slug: map.slug,
    title: map.title,
    ...(map.subtitle ? { subtitle: map.subtitle } : {}),
    tags: map.tags,
    ...(map.squares ? { squares: map.squares } : {}),
    width: map.image.width,
    height: map.image.height,
    patreonUrl: map.patreonUrl,
    images: imageUrls(map, urlFor),
  };
}

export { toMapEntry };
export type { MapEntry };
