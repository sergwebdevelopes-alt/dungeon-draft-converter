import { useEffect, useRef, useState } from 'react';
import { SITE, type SiteConfig } from '../../../shared/config/site.ts';
import { Alert } from '../../../shared/ui/Alert.tsx';
import { Container } from '../../../shared/ui/Container.tsx';
import { Reveal } from '../../../shared/ui/motion/index.ts';
import { PageTitle } from '../../../shared/ui/PageTitle.tsx';
import { MembershipSection } from '../../membership/index.ts';
import type { GalleryApi } from '../api.ts';
import {
  filterMaps,
  findMap,
  neighbour,
  tagsOf,
  type MapEntry,
} from '../model/catalog.ts';
import { useMapCatalog } from '../useMapCatalog.ts';
import { useOpenMap } from '../useOpenMap.ts';
import { MapCard } from './MapCard.tsx';
import { MapModal } from './MapModal.tsx';
import { TagFilter } from './TagFilter.tsx';

const SKELETON_CARDS = 8;

const GRID = 'grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4';

function useOpenedSlug(slug: string | null): string | null {
  const [opened, setOpened] = useState(slug);
  if (slug && !opened) {
    setOpened(slug);
  }
  if (!slug && opened) {
    setOpened(null);
  }

  return slug ? (opened ?? slug) : null;
}

function useCardFocus(openSlug: string | null) {
  const cards = useRef(new Map<string, HTMLButtonElement>());
  const lastOpened = useRef<string | null>(null);

  useEffect(() => {
    if (openSlug) {
      lastOpened.current = openSlug;
      return;
    }
    if (lastOpened.current) {
      cards.current.get(lastOpened.current)?.focus();
      lastOpened.current = null;
    }
  }, [openSlug]);

  function register(slug: string) {
    return (button: HTMLButtonElement | null) => {
      if (button) {
        cards.current.set(slug, button);
      } else {
        cards.current.delete(slug);
      }
    };
  }

  return register;
}

function CardSkeletons() {
  return Array.from({ length: SKELETON_CARDS }, (_, i) => (
    <li
      key={i}
      aria-hidden="true"
      className={i === 0 ? 'col-span-2 row-span-2' : undefined}
    >
      <span
        className={`block rounded-2xl bg-sunken motion-safe:animate-pulse ${i === 0 ? 'h-full min-h-80' : 'aspect-[4/5]'}`}
      />
    </li>
  ));
}

function Gallery({ maps }: { maps: MapEntry[] }) {
  const [tag, setTag] = useState<string | null>(null);
  const { slug, open, show, close } = useOpenMap();

  const visible = filterMaps(maps, tag);
  const openMap = findMap(maps, slug);
  const openedSlug = useOpenedSlug(openMap?.slug ?? null);
  const browsing = openMap && visible.includes(openMap) ? visible : maps;
  const registerCard = useCardFocus(openMap?.slug ?? null);

  function neighbourOf(map: MapEntry, direction: 1 | -1) {
    return neighbour(browsing, map.slug, direction);
  }

  function step(direction: 1 | -1) {
    const next = openMap && neighbourOf(openMap, direction);
    if (next) {
      show(next.slug);
    }
  }

  return (
    <>
      <TagFilter tags={tagsOf(maps)} active={tag} onChange={setTag} />

      <ul className={GRID}>
        {visible.map((map, index) => (
          <li
            key={map.slug}
            className={index === 0 ? 'col-span-2 row-span-2' : undefined}
          >
            <Reveal index={index} className="h-full">
              <MapCard
                map={map}
                featured={index === 0}
                isOpen={map.slug === openedSlug}
                buttonRef={registerCard(map.slug)}
                onOpen={() => open(map.slug)}
              />
            </Reveal>
          </li>
        ))}
      </ul>

      {openMap && (
        <MapModal
          map={openMap}
          morph={openMap.slug === openedSlug}
          position={{
            index: browsing.indexOf(openMap),
            total: browsing.length,
          }}
          neighbours={[
            neighbourOf(openMap, -1),
            neighbourOf(openMap, 1),
          ].filter((map): map is MapEntry => map !== null)}
          onClose={close}
          onPrevious={() => step(-1)}
          onNext={() => step(1)}
        />
      )}
    </>
  );
}

interface GalleryPageProps {
  api?: GalleryApi;
  site?: SiteConfig;
}

function GalleryPage({ api, site = SITE }: GalleryPageProps) {
  const catalog = useMapCatalog(api);

  return (
    <>
      <PageTitle title="Maps" />
      <Container className="grid gap-8 pt-12 pb-4 sm:pt-16">
        <header className="grid gap-4">
          <p className="text-sm font-bold tracking-[0.2em] text-gold uppercase">
            Gallery
          </p>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-6xl">
            Maps from the Lair
          </h1>
          <p className="max-w-2xl text-lg text-muted">
            Battle maps drawn in Dungeondraft. Open one to see it up close, with
            or without the grid.
          </p>
        </header>

        {catalog.status === 'ready' && <Gallery maps={catalog.maps} />}

        {catalog.status === 'loading' && (
          <ul aria-label="Loading maps" className={GRID}>
            <CardSkeletons />
          </ul>
        )}

        {catalog.status === 'error' && (
          <Alert tone="error">
            The maps could not be loaded. Reload the page to try again.
          </Alert>
        )}
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
