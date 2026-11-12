import { coverImage, imageKey } from '../domain/map-image-keys.ts';
import type {
  MapEntry,
  MapImageUrls,
  MapPicture,
} from '../../../contracts/gallery-api.ts';
import type { MapRecord } from '../domain/map-record.ts';

type UrlFor = (key: string) => string;

function imageUrls(map: MapRecord, urlFor: UrlFor): MapImageUrls {
  const cover = coverImage(map);

  return {
    card: urlFor(imageKey(map, cover, 'card')),
    view: urlFor(imageKey(map, cover, 'view')),
    backdrop: urlFor(imageKey(map, cover, 'backdrop')),
  };
}

function pictures(map: MapRecord, urlFor: UrlFor): MapPicture[] {
  return map.images.map((image) => ({
    view: urlFor(imageKey(map, image, 'view')),
    thumb: urlFor(imageKey(map, image, 'thumb')),
    width: image.width,
    height: image.height,
  }));
}

function toMapEntry(map: MapRecord, urlFor: UrlFor): MapEntry {
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
    ...(map.images.length > 1 ? { pictures: pictures(map, urlFor) } : {}),
  };
}

export { toMapEntry };
