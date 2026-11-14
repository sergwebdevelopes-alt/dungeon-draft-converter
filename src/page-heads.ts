import type { Request } from 'express';
import { NOT_FOUND_PAGE, SITE_PAGES } from './contracts/site-pages.ts';
import type {
  FindCollectionPage,
  FindMapPage,
} from './features/gallery/http/map-page.ts';
import type { PageImage } from './infrastructure/http-server/page-head.ts';
import { mapData, siteData } from './structured-data.ts';
import type {
  Page,
  PageFor,
} from './infrastructure/http-server/serve-web-app.ts';

const LOOKUP_FAILED = 'lookup failed';

const SITE_IMAGE = {
  path: '/og-image.jpg',
  alt: 'Lair of Artificer: battle maps for epic adventures',
  width: 1200,
  height: 630,
};

function isSitePage(path: string): path is keyof typeof SITE_PAGES {
  return Object.hasOwn(SITE_PAGES, path);
}

const MAP_PATH = /^\/maps\/[^/]+\/([^/]+)$/;
const COLLECTION_PATH = /^\/maps\/([^/]+)$/;

function requestedMapSlug(req: Request): string | null {
  const slug = MAP_PATH.exec(req.path)?.[1];
  return slug ? decodeURIComponent(slug) : null;
}

function requestedCollectionSlug(req: Request): string | null {
  return COLLECTION_PATH.exec(req.path)?.[1] ?? null;
}

type LogError = (message: string, error: unknown) => void;

function logToConsole(message: string, error: unknown): void {
  console.error(message, error);
}

interface SiteLinks {
  url: string;
  patreonUrl: string;
}

function createPageFor(
  site: SiteLinks,
  findMapPage: FindMapPage,
  findCollectionPage: FindCollectionPage,
  logError: LogError = logToConsole,
): PageFor {
  const absolute = (path: string) => new URL(path, site.url).href;

  const siteImage: PageImage = {
    url: absolute(SITE_IMAGE.path),
    alt: SITE_IMAGE.alt,
    width: SITE_IMAGE.width,
    height: SITE_IMAGE.height,
  };

  async function findMap(slug: string) {
    try {
      return await findMapPage(slug);
    } catch (error) {
      logError(`Could not find the map ${slug} for its page head:`, error);
      return LOOKUP_FAILED;
    }
  }

  async function mapPage(slug: string): Promise<Page | null> {
    const map = await findMap(slug);
    if (map === LOOKUP_FAILED) {
      return null;
    }
    if (!map) {
      return sitePage('/maps', false);
    }

    const url = absolute(map.path);
    return {
      status: 200,
      head: {
        title: map.title,
        description: map.description,
        url,
        image: { url: absolute(map.imageUrl), alt: map.imageAlt },
        structuredData: mapData(absolute, map, url),
      },
    };
  }

  async function findCollection(slug: string) {
    try {
      return await findCollectionPage(slug);
    } catch (error) {
      logError(
        `Could not find the collection ${slug} for its page head:`,
        error,
      );
      return LOOKUP_FAILED;
    }
  }

  async function collectionPage(slug: string): Promise<Page | null> {
    const collection = await findCollection(slug);
    if (collection === LOOKUP_FAILED) {
      return null;
    }
    if (!collection) {
      return sitePage('/maps', false);
    }

    return {
      status: 200,
      head: {
        title: collection.title,
        description: collection.description,
        url: absolute(collection.path),
        image: siteImage,
        noindex: false,
      },
    };
  }

  function sitePage(path: string, exists = true): Page {
    const known = exists && isSitePage(path);
    const text = known ? SITE_PAGES[path] : NOT_FOUND_PAGE;

    return {
      status: known ? 200 : 404,
      head: {
        ...text,
        url: absolute(known ? path : '/'),
        image: siteImage,
        noindex: !known,
        ...(path === '/'
          ? { structuredData: siteData(absolute, site.patreonUrl) }
          : {}),
      },
    };
  }

  return async (req) => {
    const slug = requestedMapSlug(req);
    const map = slug ? await mapPage(slug) : null;
    if (map) {
      return map;
    }

    const collectionSlug = requestedCollectionSlug(req);
    const collection = collectionSlug
      ? await collectionPage(collectionSlug)
      : null;
    if (collection) {
      return collection;
    }

    return sitePage(slug || collectionSlug ? '/maps' : req.path);
  };
}

export { createPageFor };
export type { LogError, SiteLinks };
