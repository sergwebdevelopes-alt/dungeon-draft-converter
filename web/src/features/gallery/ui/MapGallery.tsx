import { useEffect, useRef } from 'react';
import { useNearViewport } from '@/shared/hooks/useNearViewport.ts';
import { Button } from '@/shared/ui/Button.tsx';
import { Alert } from '@/shared/ui/Alert.tsx';
import { Reveal } from '@/shared/ui/motion/index.ts';
import { usePageTitle } from '@/shared/hooks/usePageTitle.ts';
import { SITE_PAGES, mapPageTitle } from '@contracts/site-pages.ts';
import type { GalleryApi } from '../api/gallery-api.ts';
import { findMap } from '../model/catalog.ts';
import { hasMore, type PagesState } from '../model/map-pages.ts';
import { useLinkedMap } from '../hooks/useLinkedMap.ts';
import { useMapPages } from '../hooks/useMapPages.ts';
import { useOpenMap } from '../hooks/useOpenMap.ts';
import { MapCard } from './MapCard.tsx';
import { MapModal } from './MapModal.tsx';
import { TagFilter } from './TagFilter.tsx';

const SKELETON_CARDS = 8;

const GRID = 'grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4';

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

const GALLERY_TITLE = SITE_PAGES['/maps'].title;

interface GalleryProps {
  state: PagesState;
  api?: GalleryApi;
  onLoadMore: () => void;
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
  const { slug, open, close } = useOpenMap();
  const { maps } = state;

  const listed = findMap(maps, slug);
  const openMap = useLinkedMap(slug, listed, api);
  const registerCard = useCardFocus(openMap?.slug ?? null);
  usePageTitle(openMap ? mapPageTitle(openMap) : GALLERY_TITLE);

  return (
    <>
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
                isOpen={map === listed}
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
          key={openMap.slug}
          map={openMap}
          morph={listed !== null}
          onClose={close}
        />
      )}
    </>
  );
}

interface MapGalleryProps {
  api?: GalleryApi;
}

function MapGallery({ api }: MapGalleryProps) {
  const { state, chooseTag, loadMore } = useMapPages(api);
  const loaded = state.status !== 'loading' && state.status !== 'error';
  usePageTitle(GALLERY_TITLE, { enabled: !loaded });

  return (
    <>
      {state.tags.length > 0 && (
        <TagFilter tags={state.tags} active={state.tag} onChange={chooseTag} />
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
    </>
  );
}

export { MapGallery };
