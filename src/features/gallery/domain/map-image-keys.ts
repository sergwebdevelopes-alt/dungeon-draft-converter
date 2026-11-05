import type { MapRecord } from './map-record.ts';

const IMAGE_NAMES = ['card', 'view', 'backdrop'] as const;

type ImageName = (typeof IMAGE_NAMES)[number];

function imageFolder(map: MapRecord): string {
  return `${map.postId}/${map.image.mediaId}`;
}

function imageKey(map: MapRecord, name: ImageName): string {
  return `${imageFolder(map)}/${name}.webp`;
}

export { IMAGE_NAMES, imageFolder, imageKey };
export type { ImageName };
