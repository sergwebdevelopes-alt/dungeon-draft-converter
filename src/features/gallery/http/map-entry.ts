import { imageKey, type ImageName } from '../domain/map-image-keys.ts';
import type { MapEntry } from '../../../contracts/gallery-api.ts';
import type { MapRecord } from '../domain/map-record.ts';

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
    ...(map.description ? { description: map.description } : {}),
    tags: map.tags,
    ...(map.squares ? { squares: map.squares } : {}),
    width: map.image.width,
    height: map.image.height,
    patreonUrl: map.patreonUrl,
    images: imageUrls(map, urlFor),
  };
}

export { toMapEntry };
