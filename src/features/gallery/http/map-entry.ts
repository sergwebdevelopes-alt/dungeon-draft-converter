import { coverImage, imageKey } from '../domain/map-image-keys.ts';
import type { MapImageUrls } from '../../../contracts/gallery-api.ts';
import type { MapEntry } from '../../../contracts/gallery-api.ts';
import type { MapRecord } from '../domain/map-record.ts';

function imageUrls(
  map: MapRecord,
  urlFor: (key: string) => string,
): MapImageUrls {
  const cover = coverImage(map);

  return {
    card: urlFor(imageKey(map, cover, 'card')),
    view: urlFor(imageKey(map, cover, 'view')),
    backdrop: urlFor(imageKey(map, cover, 'backdrop')),
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
    width: coverImage(map).width,
    height: coverImage(map).height,
    patreonUrl: map.patreonUrl,
    images: imageUrls(map, urlFor),
  };
}

export { toMapEntry };
