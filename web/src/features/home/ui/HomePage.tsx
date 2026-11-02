import { SITE, type SiteConfig } from '../../../shared/config/site.ts';
import { PageTitle } from '../../../shared/ui/PageTitle.tsx';
import {
  useMapCatalog,
  type GalleryApi,
  type MapEntry,
} from '../../gallery/index.ts';
import { MembershipSection } from '../../membership/index.ts';
import { ConverterTeaser } from './ConverterTeaser.tsx';
import { Hero } from './Hero.tsx';
import { LatestMaps } from './LatestMaps.tsx';

const BACKDROP_MAPS = 5;
const LATEST_MAPS = 4;

function teaserMap(maps: MapEntry[]): MapEntry | null {
  return maps.find((map) => map.squares.x > map.squares.y) ?? maps[0] ?? null;
}

interface HomePageProps {
  api?: GalleryApi;
  site?: SiteConfig;
}

function HomePage({ api, site = SITE }: HomePageProps) {
  const catalog = useMapCatalog(api);
  const maps = catalog.status === 'ready' ? catalog.maps : [];

  return (
    <>
      <PageTitle />
      <Hero maps={maps.slice(0, BACKDROP_MAPS)} />
      <LatestMaps maps={maps.slice(0, LATEST_MAPS)} total={maps.length} />
      <ConverterTeaser map={teaserMap(maps)} />
      <MembershipSection
        plans={site.membership.plans}
        followUrl={site.links.patreon}
      />
    </>
  );
}

export { HomePage };
