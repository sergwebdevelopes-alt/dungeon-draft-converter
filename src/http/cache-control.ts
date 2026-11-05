import path from 'node:path';
import { GALLERY_IMAGES_URL } from '../config.ts';

const FOREVER = 'public, max-age=31536000, immutable';
const ONE_DAY = 'public, max-age=86400';
const REVALIDATE = 'no-cache';

const IMAGE_EXTENSIONS = new Set(['.webp', '.png', '.jpg', '.jpeg', '.ico']);

function isGalleryImage(urlPath: string, isImage: boolean): boolean {
  return isImage && urlPath.startsWith(`${GALLERY_IMAGES_URL}/`);
}

function cacheControlFor(urlPath: string): string {
  const isImage = IMAGE_EXTENSIONS.has(path.extname(urlPath));

  if (urlPath.startsWith('/assets/') || isGalleryImage(urlPath, isImage)) {
    return FOREVER;
  }
  if (isImage) {
    return ONE_DAY;
  }

  return REVALIDATE;
}

export { cacheControlFor };
