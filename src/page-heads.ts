import type { Request } from 'express';
import {
  NOT_FOUND_PAGE,
  SITE_PAGES,
  pageTitle,
} from './contracts/site-pages.ts';
import type { FindMapPage } from './features/gallery/http/map-page.ts';
import type { PageImage } from './infrastructure/http-server/page-head.ts';
import type {
  Page,
  PageFor,
} from './infrastructure/http-server/serve-web-app.ts';

const SITE_IMAGE = {
  path: '/og-image.jpg',
  alt: 'Lair of Artificer: battle maps for epic adventures',
  width: 1200,
  height: 630,
};

function isSitePage(path: string): path is keyof typeof SITE_PAGES {
  return Object.hasOwn(SITE_PAGES, path);
}

function mapSlugOf(req: Request): string | null {
  const slug = req.query.map;
  return req.path === '/maps' && typeof slug === 'string' && slug ? slug : null;
}

type LogError = (message: string, error: unknown) => void;

function logToConsole(message: string, error: unknown): void {
  console.error(message, error);
}

function createPageFor(
  siteUrl: string,
  findMapPage: FindMapPage,
  logError: LogError = logToConsole,
): PageFor {
  const absolute = (path: string) => new URL(path, siteUrl).href;

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
      return null;
    }
  }

  async function mapPage(slug: string): Promise<Page | null> {
    const map = await findMap(slug);
    if (!map) {
      return null;
    }

    return {
      status: 200,
      head: {
        title: pageTitle(map.title),
        description: map.description,
        url: absolute(`/maps?map=${encodeURIComponent(slug)}`),
        image: { url: absolute(map.imageUrl), alt: map.imageAlt },
      },
    };
  }

  function sitePage(path: string): Page {
    const known = isSitePage(path);
    const text = known ? SITE_PAGES[path] : NOT_FOUND_PAGE;

    return {
      status: known ? 200 : 404,
      head: {
        ...text,
        url: absolute(known ? path : '/'),
        image: siteImage,
        noindex: !known,
      },
    };
  }

  return async (req) => {
    const slug = mapSlugOf(req);
    const map = slug ? await mapPage(slug) : null;
    return map ?? sitePage(req.path);
  };
}

export { createPageFor };
export type { LogError };
