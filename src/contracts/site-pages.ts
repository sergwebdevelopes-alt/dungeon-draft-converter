const SITE_NAME = 'Lair of Artificer';
const SITE_TAGLINE = 'Battle maps for epic adventures';

interface PageText {
  title: string;
  description: string;
}

function pageTitle(name?: string): string {
  return name ? `${name} · ${SITE_NAME}` : `${SITE_NAME} · ${SITE_TAGLINE}`;
}

const SITE_PAGES = {
  '/': {
    title: pageTitle(),
    description:
      'Hand-drawn Dungeondraft battle maps with VTT-ready files, four to eight new maps every month, and a free converter for .dd2vtt exports.',
  },
  '/maps': {
    title: pageTitle('Maps'),
    description:
      'Browse every Lair of Artificer battle map, see each one up close with or without the grid, and get the files on Patreon.',
  },
  '/converter': {
    title: pageTitle('Converter'),
    description:
      'Free Dungeondraft converter: turn .dd2vtt exports into JPG and WebP images for your virtual tabletop or for print, with or without the grid.',
  },
} as const satisfies Record<string, PageText>;

const NOT_FOUND_PAGE: PageText = {
  title: pageTitle('Page not found'),
  description: 'This page does not exist.',
};

export { NOT_FOUND_PAGE, SITE_NAME, SITE_PAGES, SITE_TAGLINE, pageTitle };
export type { PageText };
