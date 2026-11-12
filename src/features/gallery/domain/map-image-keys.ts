import type { MapImage, MapRecord } from './map-record.ts';

type ImageName = 'card' | 'view' | 'backdrop' | 'thumb';

const COVER_NAMES: ImageName[] = ['card', 'view', 'backdrop'];
const OTHER_NAMES: ImageName[] = ['view', 'thumb'];

function coverImage(map: MapRecord): MapImage {
  return map.images[0];
}

function imageFolder(map: MapRecord, image: MapImage): string {
  return `${map.postId}/${image.mediaId}`;
}

function imageFolders(map: MapRecord): string[] {
  return map.images.map((image) => imageFolder(map, image));
}

function imageKey(map: MapRecord, image: MapImage, name: ImageName): string {
  return `${imageFolder(map, image)}/${name}.webp`;
}

function imageNamesFor(map: MapRecord, image: MapImage): ImageName[] {
  if (image !== coverImage(map)) {
    return OTHER_NAMES;
  }

  return map.images.length > 1 ? [...COVER_NAMES, 'thumb'] : COVER_NAMES;
}

export { coverImage, imageFolder, imageFolders, imageKey, imageNamesFor };
export type { ImageName };
