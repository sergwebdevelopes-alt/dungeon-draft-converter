import path from 'node:path';

const FOREVER = 'public, max-age=31536000, immutable';
const ONE_DAY = 'public, max-age=86400';
const REVALIDATE = 'no-cache';

const IMAGE_EXTENSIONS = new Set(['.webp', '.png', '.jpg', '.jpeg', '.ico']);

function cacheControlFor(urlPath: string): string {
  if (urlPath.startsWith('/assets/')) {
    return FOREVER;
  }
  if (IMAGE_EXTENSIONS.has(path.extname(urlPath))) {
    return ONE_DAY;
  }

  return REVALIDATE;
}

export { cacheControlFor };
