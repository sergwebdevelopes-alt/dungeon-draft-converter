import { SITE, type SiteConfig } from '../../../shared/config/site.ts';
import { PageTitle } from '../../../shared/ui/PageTitle.tsx';
import {
  hasSquares,
  useLatestMaps,
  type GalleryApi,
  type GriddedMap,
  type MapEntry,
} from '../../gallery/index.ts';
import { MembershipSection } from '../../membership/index.ts';
import { ConverterTeaser } from './ConverterTeaser.tsx';
import { Hero } from './Hero.tsx';
import { LatestMaps } from './LatestMaps.tsx';

const BACKDROP_MAPS = 5;
const LATEST_MAPS = 4;

function teaserMap(maps: MapEntry[]): GriddedMap | null {
  const gridded = maps.filter(hasSquares);

  return gridded.find((map) => map.width > map.height) ?? gridded[0] ?? null;
}

interface HomePageProps {
  api?: GalleryApi;
  site?: SiteConfig;
}

function HomePage({ api, site = SITE }: HomePageProps) {
  const latest = useLatestMaps(api);
  const maps = latest.status === 'ready' ? latest.maps : [];
  const total = latest.status === 'ready' ? latest.total : 0;

  return (
    <>
      <PageTitle />
      <Hero maps={maps.slice(0, BACKDROP_MAPS)} />
      <LatestMaps maps={maps.slice(0, LATEST_MAPS)} total={total} />
      <ConverterTeaser map={teaserMap(maps)} />
      <MembershipSection
        siteName={site.name}
        plans={site.membership.plans}
        followUrl={site.links.patreon}
      />
    </>
  );
}

export { HomePage };
