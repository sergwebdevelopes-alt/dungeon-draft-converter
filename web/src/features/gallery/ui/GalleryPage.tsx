import { useEffect, useRef, useState } from 'react';
import { MotionProvider, Reveal } from '../../../shared/ui/motion/index.ts';
import { PageTitle } from '../../../shared/ui/PageTitle.tsx';
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
    <li key={i} aria-hidden="true" className="grid gap-3">
      <span className="block aspect-[4/5] rounded-xl bg-sunken motion-safe:animate-pulse" />
      <span className="h-5 w-3/4 rounded bg-sunken" />
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

      <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
        {visible.map((map, index) => (
          <li key={map.slug}>
            <Reveal index={index}>
              <MapCard
                map={map}
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

function GalleryPage({ api }: { api?: GalleryApi }) {
  const catalog = useMapCatalog(api);

  return (
    <MotionProvider>
      <PageTitle title="Maps" />
      <div className="grid gap-8 pb-10">
        <header className="grid max-w-2xl gap-3">
          <h1 className="font-display text-3xl font-bold tracking-wide sm:text-5xl">
            Maps from the Lair
          </h1>
          <p className="text-lg text-muted">
            Battle maps drawn in Dungeondraft. Open one to see it up close, with
            or without the grid.
          </p>
        </header>

        {catalog.status === 'ready' && <Gallery maps={catalog.maps} />}

        {catalog.status === 'loading' && (
          <ul
            aria-label="Loading maps"
            className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6"
          >
            <CardSkeletons />
          </ul>
        )}

        {catalog.status === 'error' && (
          <p
            role="alert"
            className="rounded-lg border-l-[3px] border-danger bg-danger-soft px-3 py-2"
          >
            The maps could not be loaded. Reload the page to try again.
          </p>
        )}
      </div>
    </MotionProvider>
  );
}

export { GalleryPage };
