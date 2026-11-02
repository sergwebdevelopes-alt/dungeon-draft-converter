interface NavLink {
  label: string;
  href: string;
}

interface SiteConfig {
  name: string;
  tagline?: string;
  nav: NavLink[];
  links: {
    patreon: string;
  };
}

const SITE: SiteConfig = {
  name: 'Lair of Artificer',
  nav: [{ label: 'Converter', href: '/' }],
  links: {
    patreon: 'https://www.patreon.com/cw/LairofArtificer',
  },
};

export { SITE };
export type { NavLink, SiteConfig };
