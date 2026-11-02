interface NavItem {
  label: string;
  href: string;
}

interface PlanPrice {
  cents: number;
  currency: string;
  period: 'month' | 'year';
}

interface MembershipPlan {
  id: string;
  name: string;
  price: PlanPrice;
  description: string;
  perks: string[];
  joinUrl: string;
  featured?: boolean;
}

interface SiteConfig {
  name: string;
  tagline?: string;
  nav: NavItem[];
  links: {
    patreon: string;
    twitter?: string;
  };
  membership: {
    plans: MembershipPlan[];
  };
}

const SITE: SiteConfig = {
  name: 'Lair of Artificer',
  nav: [
    { label: 'Home', href: '/' },
    { label: 'Maps', href: '/maps' },
    { label: 'Converter', href: '/converter' },
  ],
  links: {
    patreon: 'https://www.patreon.com/cw/LairofArtificer',
    twitter: 'https://twitter.com/lairofartificer',
  },
  membership: {
    plans: [
      {
        id: 'coffee',
        name: 'Buy the Creator a Coffee',
        price: { cents: 500, currency: 'USD', period: 'month' },
        description:
          'More caffeine, more maps. Pure support that keeps new battle maps coming every month.',
        perks: [],
        joinUrl:
          'https://www.patreon.com/checkout/LairofArtificer?rid=29855382',
        featured: true,
      },
    ],
  },
};

export { SITE };
export type { MembershipPlan, NavItem, PlanPrice, SiteConfig };
