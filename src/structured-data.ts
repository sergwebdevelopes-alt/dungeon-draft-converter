import { SITE_NAME } from './contracts/site-pages.ts';
import type { MapPage } from './features/gallery/http/map-page.ts';

const SCHEMA = 'https://schema.org';
const LOGO_PATH = '/icon-192.png';

type Absolute = (path: string) => string;

function siteOrganization(absolute: Absolute) {
  return {
    '@type': 'Organization',
    name: SITE_NAME,
    url: absolute('/'),
  };
}

function siteData(absolute: Absolute, patreonUrl: string): object[] {
  return [
    {
      '@context': SCHEMA,
      '@type': 'WebSite',
      name: SITE_NAME,
      url: absolute('/'),
    },
    {
      '@context': SCHEMA,
      ...siteOrganization(absolute),
      logo: absolute(LOGO_PATH),
      sameAs: [patreonUrl],
    },
  ];
}

function mapData(absolute: Absolute, map: MapPage, pageUrl: string): object[] {
  return [
    {
      '@context': SCHEMA,
      '@type': 'ImageObject',
      name: map.title,
      description: map.description,
      url: pageUrl,
      contentUrl: absolute(map.imageUrl),
      datePublished: map.publishedAt,
      creator: siteOrganization(absolute),
      creditText: SITE_NAME,
      copyrightNotice: SITE_NAME,
      acquireLicensePage: map.patreonUrl,
    },
  ];
}

export { mapData, siteData };
export type { Absolute };
