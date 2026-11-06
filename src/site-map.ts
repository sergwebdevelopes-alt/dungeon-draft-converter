import type { RequestHandler } from 'express';
import { SITE_PAGES } from './contracts/site-pages.ts';
import type { ListMapLinks } from './features/gallery/http/map-page.ts';
import {
  renderSitemap,
  type SitemapEntry,
} from './infrastructure/http-server/sitemap.ts';

function createSitemapRoute(
  siteUrl: string,
  listMapLinks: ListMapLinks,
): RequestHandler {
  const absolute = (path: string) => new URL(path, siteUrl).href;

  return async (_req, res) => {
    const maps = await listMapLinks();

    const entries: SitemapEntry[] = [
      ...Object.keys(SITE_PAGES).map((path) => ({ url: absolute(path) })),
      ...maps.map((map) => ({
        url: absolute(map.path),
        lastModified: map.publishedAt,
      })),
    ];

    res
      .set('Cache-Control', 'no-cache')
      .type('application/xml')
      .send(renderSitemap(entries));
  };
}

export { createSitemapRoute };
