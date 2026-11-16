import { CONVERTER_FAQ, CONVERTER_NAME } from './contracts/converter-guide.ts';
import { SITE_NAME, SITE_PAGES } from './contracts/site-pages.ts';
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
      name: map.name,
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

function converterData(absolute: Absolute): object[] {
  return [
    {
      '@context': SCHEMA,
      '@type': 'WebApplication',
      name: CONVERTER_NAME,
      url: absolute('/converter'),
      description: SITE_PAGES['/converter'].description,
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Any',
      browserRequirements: 'Requires JavaScript',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      publisher: siteOrganization(absolute),
    },
    {
      '@context': SCHEMA,
      '@type': 'FAQPage',
      mainEntity: CONVERTER_FAQ.map(({ question, answer }) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: { '@type': 'Answer', text: answer },
      })),
    },
  ];
}

export { converterData, mapData, siteData };
export type { Absolute };
