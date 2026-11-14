import { useParams } from 'react-router';
import {
  MapGallery,
  collectionAt,
  useLatestMaps,
  type GalleryApi,
} from '@/features/gallery/index.ts';
import { MembershipSection } from '@/features/membership/index.ts';
import { SITE, type SiteConfig } from '@/shared/config/site.ts';
import { Container } from '@/shared/ui/Container.tsx';

interface GalleryPageProps {
  api?: GalleryApi;
  site?: SiteConfig;
}

function GalleryPage({ api, site = SITE }: GalleryPageProps) {
  const { collection = null } = useParams();
  const latest = useLatestMaps(api);
  const shown =
    latest.status === 'ready'
      ? collectionAt(latest.collections, collection)
      : null;

  return (
    <>
      <Container className="grid gap-8 pt-12 pb-4 sm:pt-16">
        <header className="grid gap-4">
          <p className="text-sm font-bold tracking-[0.2em] text-gold uppercase">
            {shown ? 'Collection' : 'Gallery'}
          </p>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-6xl">
            {shown ? shown.name : 'Maps from the Lair'}
          </h1>
          <p className="max-w-2xl text-lg text-muted">
            Battle maps drawn in Dungeondraft. Open one to see it up close, with
            or without the grid.
          </p>
        </header>

        <MapGallery api={api} collection={collection} />
      </Container>

      <MembershipSection
        siteName={site.name}
        plans={site.membership.plans}
        followUrl={site.links.patreon}
      />
    </>
  );
}

export { GalleryPage };
