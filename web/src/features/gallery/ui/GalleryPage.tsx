import { useEffect, useRef, useState } from 'react';
import { useNearViewport } from '../../../shared/lib/useNearViewport.ts';
import { Button } from '../../../shared/ui/Button.tsx';
import { SITE, type SiteConfig } from '../../../shared/config/site.ts';
import { Alert } from '../../../shared/ui/Alert.tsx';
import { Container } from '../../../shared/ui/Container.tsx';
import { Reveal } from '../../../shared/ui/motion/index.ts';
import { PageTitle } from '../../../shared/ui/PageTitle.tsx';
import { MembershipSection } from '../../membership/index.ts';
import type { GalleryApi } from '../api.ts';
import { findMap, neighbour, type MapEntry } from '../model/catalog.ts';
import { hasMore, isComplete, type PagesState } from '../model/map-pages.ts';
import { useLinkedMap } from '../useLinkedMap.ts';
import { useMapPages } from '../useMapPages.ts';
import { useOpenMap } from '../useOpenMap.ts';
import { MapCard } from './MapCard.tsx';
import { MapModal } from './MapModal.tsx';
import { TagFilter } from './TagFilter.tsx';

const SKELETON_CARDS = 8;
const PRELOAD_BEFORE_END = 3;

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

interface GalleryProps {
  state: PagesState;
  api?: GalleryApi;
  onLoadMore: () => void;
}

function useStepPastLoaded(
  state: PagesState,
  slug: string | null,
  show: (slug: string) => void,
) {
  const waitingAfter = useRef<string | null>(null);

  useEffect(() => {
    const from = waitingAfter.current;
    if (!from || from !== slug) {
      return;
    }

    const next = neighbour(state.maps, from, 1, false);
    if (next) {
      waitingAfter.current = null;
      show(next.slug);
    }
  }, [state.maps, slug, show]);

  return (from: string) => {
    waitingAfter.current = from;
  };
}

function MoreMaps({ state, onLoadMore }: Omit<GalleryProps, 'api'>) {
  const more = hasMore(state);
  const sentinel = useNearViewport<HTMLDivElement>(onLoadMore, {
    enabled: more && state.status === 'ready',
    watch: state.maps.length,
  });

  if (!more) {
    return null;
  }

  const loading = state.status === 'loadingMore';
  const failed = state.status === 'moreFailed';

  return (
    <div ref={sentinel} className="grid justify-items-center gap-3">
      {failed && <Alert tone="error">More maps could not be loaded.</Alert>}
      <Button variant="secondary" disabled={loading} onClick={onLoadMore}>
        {loading
          ? 'Loading more maps…'
          : failed
            ? 'Try again'
            : 'Show more maps'}
      </Button>
    </div>
  );
}

function Gallery({ state, api, onLoadMore }: GalleryProps) {
  const { slug, open, show, close } = useOpenMap();
  const { maps } = state;

  const listed = findMap(maps, slug);
  const openMap = useLinkedMap(slug, listed, api);
  const openedSlug = useOpenedSlug(listed?.slug ?? null);
  const registerCard = useCardFocus(openMap?.slug ?? null);
  const waitForNext = useStepPastLoaded(state, slug, show);
  const index = listed ? maps.indexOf(listed) : -1;
  const wrap = isComplete(state);

  useEffect(() => {
    if (index !== -1 && index >= maps.length - PRELOAD_BEFORE_END) {
      onLoadMore();
    }
  }, [index, maps.length, onLoadMore]);

  function neighbourOf(map: MapEntry, direction: 1 | -1) {
    return neighbour(maps, map.slug, direction, wrap);
  }

  function step(direction: 1 | -1) {
    if (!openMap) {
      return;
    }

    const next = neighbourOf(openMap, direction);
    if (next) {
      show(next.slug);
      return;
    }

    if (direction === 1 && listed && hasMore(state)) {
      waitForNext(listed.slug);
      onLoadMore();
    }
  }

  return (
    <>
      <PageTitle title={openMap?.title ?? 'Maps'} />
      <ul className={GRID}>
        {maps.map((map, i) => (
          <li
            key={map.slug}
            className={i === 0 ? 'col-span-2 row-span-2' : undefined}
          >
            <Reveal index={i} className="h-full">
              <MapCard
                map={map}
                featured={i === 0}
                isOpen={map.slug === openedSlug}
                buttonRef={registerCard(map.slug)}
                onOpen={() => open(map.slug)}
              />
            </Reveal>
          </li>
        ))}
      </ul>

      <MoreMaps state={state} onLoadMore={onLoadMore} />

      {openMap && (
        <MapModal
          map={openMap}
          morphSlug={openedSlug}
          position={listed ? { index, total: state.total } : undefined}
          previous={listed && neighbourOf(listed, -1)}
          next={listed && neighbourOf(listed, 1)}
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
  const { state, chooseTag, loadMore } = useMapPages(api);
  const loaded = state.status !== 'loading' && state.status !== 'error';

  return (
    <>
      {!loaded && <PageTitle title="Maps" />}
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

        {state.tags.length > 0 && (
          <TagFilter
            tags={state.tags}
            active={state.tag}
            onChange={chooseTag}
          />
        )}

        {loaded && <Gallery state={state} api={api} onLoadMore={loadMore} />}

        {state.status === 'loading' && (
          <ul aria-label="Loading maps" className={GRID}>
            <CardSkeletons />
          </ul>
        )}

        {state.status === 'error' && (
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
