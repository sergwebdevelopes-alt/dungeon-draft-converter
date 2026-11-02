interface NavItem {
  label: string;
  href: string;
}

interface SiteConfig {
  name: string;
  tagline?: string;
  nav: NavItem[];
  links: {
    patreon: string;
  };
}

const SITE: SiteConfig = {
  name: 'Lair of Artificer',
  nav: [
    { label: 'Home', href: '/' },
    { label: 'Converter', href: '/converter' },
  ],
  links: {
    patreon: 'https://www.patreon.com/cw/LairofArtificer',
  },
};

export { SITE };
export type { NavItem, SiteConfig };
