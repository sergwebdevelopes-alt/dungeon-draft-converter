const SITE_NAME = 'Lair of Artificer';
const SITE_TAGLINE = 'Battle maps for epic adventures';
const PLAIN_COLLECTIONS = ['Original Content'];

interface PageText {
  title: string;
  description: string;
}

interface NamedMap {
  title: string;
  subtitle?: string;
  tags: string[];
}

function pageTitle(name: string): string {
  return `${name} · ${SITE_NAME}`;
}

function mapCollection({ tags }: NamedMap): string | null {
  return tags.find((tag) => !PLAIN_COLLECTIONS.includes(tag)) ?? null;
}

function mapPageName({ title, subtitle, tags }: NamedMap): string {
  const part = subtitle && !tags.includes(subtitle) ? subtitle : null;
  const name = [title, part].filter(Boolean).join(', ');

  return /\bmaps?\b/i.test(name) ? name : `${name} Battle Map`;
}

function mapPageTitle(map: NamedMap): string {
  const collection = mapCollection(map);

  return pageTitle(
    collection ? `${mapPageName(map)} · ${collection}` : mapPageName(map),
  );
}

function collectionPageText(collection: string): PageText {
  const name = /\bmaps?\b/i.test(collection)
    ? collection
    : `${collection} Battle Maps`;

  return {
    title: pageTitle(name),
    description: `Hand-drawn D&D battle maps from the ${collection} collection. View every level with or without the grid and get the VTT files on Patreon.`,
  };
}

const SITE_PAGES = {
  '/': {
    title: pageTitle('D&D Battle Maps for Foundry VTT & Roll20'),
    description:
      'Hand-drawn D&D battle maps for Curse of Strahd, Waterdeep and original adventures. Gridded and gridless images plus VTT files, new maps every month.',
  },
  '/maps': {
    title: pageTitle('D&D Battle Map Gallery'),
    description:
      'Browse D&D battle maps for Curse of Strahd, Waterdeep and more. View every level with or without the grid and get the VTT files on Patreon.',
  },
  '/converter': {
    title: pageTitle('Free dd2vtt Converter for Dungeondraft'),
    description:
      'Free online Dungeondraft converter: turn .dd2vtt exports into JPG or WebP battle maps for Foundry VTT, Roll20 or print, and merge up to 10 levels.',
  },
} as const satisfies Record<string, PageText>;

const NOT_FOUND_PAGE: PageText = {
  title: pageTitle('Page not found'),
  description: 'This page does not exist.',
};

export {
  NOT_FOUND_PAGE,
  SITE_NAME,
  SITE_PAGES,
  SITE_TAGLINE,
  collectionPageText,
  mapCollection,
  mapPageName,
  mapPageTitle,
  pageTitle,
};
export type { NamedMap, PageText };
