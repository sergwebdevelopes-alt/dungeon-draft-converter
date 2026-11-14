import { useId, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import {
  MapTileLink,
  MapView,
  useCollectionMaps,
  useLinkedMap,
  type GalleryApi,
  type MapEntry,
} from '@/features/gallery/index.ts';
import { usePageTitle } from '@/shared/hooks/usePageTitle.ts';
import { Container } from '@/shared/ui/Container.tsx';
import { SITE_PAGES, mapPageTitle } from '@contracts/site-pages.ts';

const MORE_MAPS = 4;
const CRUMB = 'font-bold text-muted transition-colors hover:text-text';

interface MapPageProps {
  notFound: ReactNode;
  api?: GalleryApi;
}

interface MapParts {
  map: MapEntry;
  api?: GalleryApi;
}

function collectionPath(map: MapEntry): string {
  return map.path.slice(0, map.path.lastIndexOf('/'));
}

function Breadcrumbs({ map }: { map: MapEntry }) {
  const [collection] = map.tags;

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2 text-sm">
        <li>
          <Link to="/maps" className={CRUMB}>
            Maps
          </Link>
        </li>
        {collection && (
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="text-muted">
              /
            </span>
            <Link to={collectionPath(map)} className={CRUMB}>
              {collection}
            </Link>
          </li>
        )}
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="text-muted">
            /
          </span>
          <span aria-current="page">{map.title}</span>
        </li>
      </ol>
    </nav>
  );
}

function MoreFromCollection({ map, api }: MapParts) {
  const [collection] = map.tags;
  const maps = useCollectionMaps(collection ?? null, MORE_MAPS + 1, api);
  const others = maps
    .filter((other) => other.slug !== map.slug)
    .slice(0, MORE_MAPS);

  if (!collection || others.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="more-maps-title" className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2
          id="more-maps-title"
          className="font-display text-xl font-bold tracking-wide sm:text-2xl"
        >
          More from {collection}
        </h2>
        <Link to={collectionPath(map)} className={CRUMB}>
          See all <span aria-hidden="true">→</span>
        </Link>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {others.map((other) => (
          <li key={other.slug}>
            <MapTileLink map={other} opensWindow={false} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function MapPage({ notFound, api }: MapPageProps) {
  const { map: slug = '' } = useParams();
  const titleId = useId();
  const { map, missing } = useLinkedMap(slug, null, api);
  usePageTitle(map ? mapPageTitle(map) : SITE_PAGES['/maps'].title, {
    enabled: !missing,
  });

  if (missing) {
    return notFound;
  }
  if (!map) {
    return null;
  }

  return (
    <Container className="grid gap-8 pt-6 pb-16 sm:pt-8">
      <div className="grid gap-3">
        <Breadcrumbs map={map} />
        <MapView
          key={map.slug}
          map={map}
          morph={false}
          titleId={titleId}
          heading="h1"
        />
      </div>
      <MoreFromCollection map={map} api={api} />
    </Container>
  );
}

export { MapPage };
