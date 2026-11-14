import { SITE, type SiteConfig } from '@/shared/config/site.ts';
import { PageTitle } from '@/shared/ui/PageTitle.tsx';
import {
  useHighlights,
  useLatestMaps,
  type GalleryApi,
} from '@/features/gallery/index.ts';
import { MembershipSection } from '@/features/membership/index.ts';
import { ConverterTeaser } from './ConverterTeaser.tsx';
import { Hero } from './Hero.tsx';
import { LatestMaps } from './LatestMaps.tsx';

const BACKDROP_MAPS = 5;

function joinUrl({ membership, links }: SiteConfig): string {
  const { plans } = membership;
  const plan = plans.find((candidate) => candidate.featured) ?? plans.at(0);

  return plan?.joinUrl ?? links.patreon;
}

interface HomePageProps {
  api?: GalleryApi;
  site?: SiteConfig;
}

function HomePage({ api, site = SITE }: HomePageProps) {
  const latest = useLatestMaps(api);
  const highlights = useHighlights(api);
  const maps = latest.status === 'ready' ? latest.maps : [];
  const total = latest.status === 'ready' ? latest.total : 0;

  return (
    <>
      <PageTitle />
      <Hero maps={maps.slice(0, BACKDROP_MAPS)} joinUrl={joinUrl(site)} />
      <LatestMaps maps={highlights} total={total} />
      <ConverterTeaser />
      <MembershipSection
        siteName={site.name}
        plans={site.membership.plans}
        followUrl={site.links.patreon}
      />
    </>
  );
}

export { HomePage };
