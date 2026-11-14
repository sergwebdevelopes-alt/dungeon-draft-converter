import { useState } from 'react';
import { useArrowKeys } from '@/shared/hooks/useArrowKeys.ts';
import { useLoadedImages } from '@/shared/hooks/useLoadedImages.ts';
import { useZoom } from '@/shared/hooks/useZoom.ts';
import { isZoomed } from '@/shared/lib/zoom.ts';
import { Reveal, SwipeCarousel } from '@/shared/ui/motion/index.ts';
import { usePictureBrowser } from '../hooks/usePictureBrowser.ts';
import { gridFits, type MapEntry } from '../model/catalog.ts';
import { MapDetails } from './MapDetails.tsx';
import { MapViewer } from './MapViewer.tsx';
import { PictureStrip } from './PictureStrip.tsx';

interface MapViewProps {
  map: MapEntry;
  morph: boolean;
  titleId: string;
  heading?: 'h1' | 'h2';
  inWindow?: boolean;
  onClose?: () => void;
}

function stayOpen(): void {
  return undefined;
}

const ROUND_BUTTON =
  'grid size-11 place-items-center rounded-full bg-black/55 text-xl text-white ring-1 ring-white/15 backdrop-blur transition hover:scale-110 hover:bg-black/75 hover:ring-white/45 active:scale-95';

function ZoomIcon({ zoomed }: { zoomed: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5 20 20" />
      <path d="M7.5 10.5h6" />
      <path
        d="M10.5 7.5v6"
        className={`origin-[10.5px_10.5px] transition-transform duration-200 ${zoomed ? 'scale-y-0' : ''}`}
      />
    </svg>
  );
}

const FRAME =
  'grid bg-surface sm:rounded-2xl sm:ring-1 sm:ring-line lg:grid-cols-[minmax(0,1fr)_340px]';
const WINDOW_FRAME =
  'h-full grid-rows-[auto_minmax(0,1fr)] overflow-hidden lg:grid-rows-1';
const PAGE_FRAME = 'overflow-clip';
const PICTURES = 'relative min-h-0 w-full bg-sunken';
const WINDOW_PICTURES = 'h-[75dvh] lg:h-auto';
const PAGE_PICTURES =
  'max-h-[75dvh] lg:sticky lg:top-(--header-height) lg:h-[min(84dvh,860px)] lg:max-h-none lg:self-start';

function MapView({
  map,
  morph,
  titleId,
  heading,
  inWindow = false,
  onClose,
}: MapViewProps) {
  const [showGrid, setShowGrid] = useState(false);
  const browser = usePictureBrowser(map);
  const { pictures, several, position, index, picture, pictureAt } = browser;
  const { showPrevious, showNext, showPicture } = browser;

  const canGrid = map.squares !== undefined && gridFits(picture, map.squares);
  const alt = [map.title, map.subtitle].filter(Boolean).join(', ');
  const morphs = morph && !browser.moved;

  const zoom = useZoom(position);
  const [pinching, setPinching] = useState(false);
  const zoomed = isZoomed(zoom.view);

  useArrowKeys(several, showPrevious, showNext);
  const loaded = useLoadedImages(pictures.map((shown) => shown.view));

  function slide(at: number) {
    return {
      key: String(at),
      content: (
        <MapViewer
          picture={pictureAt(at)}
          alt={alt}
          grid={
            at === position && showGrid && canGrid ? map.squares : undefined
          }
          morphId={morphs && at === 0 ? `map-${map.slug}` : undefined}
          fade={!loaded.has(pictureAt(at).view)}
          zoom={
            at === position
              ? {
                  view: zoom.view,
                  onChange: zoom.setView,
                  onPinch: setPinching,
                  wheelNeedsKey: !inWindow,
                }
              : undefined
          }
        />
      ),
    };
  }

  return (
    <Reveal className={`${FRAME} ${inWindow ? WINDOW_FRAME : PAGE_FRAME}`}>
      <SwipeCarousel
        className={`${PICTURES} ${inWindow ? WINDOW_PICTURES : PAGE_PICTURES}`}
        style={
          inWindow
            ? undefined
            : { aspectRatio: `${picture.width} / ${picture.height}` }
        }
        previous={several ? slide(position - 1) : null}
        current={slide(position)}
        next={several ? slide(position + 1) : null}
        onPrevious={showPrevious}
        onNext={showNext}
        onDismiss={onClose ?? stayOpen}
        locked={zoomed || pinching}
      >
        {several && (
          <>
            <button
              type="button"
              aria-label="Previous picture"
              className={`${ROUND_BUTTON} absolute top-1/2 left-4 hidden -translate-y-1/2 lg:grid`}
              onClick={showPrevious}
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Next picture"
              className={`${ROUND_BUTTON} absolute top-1/2 right-4 hidden -translate-y-1/2 lg:grid`}
              onClick={showNext}
            >
              ›
            </button>
            <PictureStrip
              pictures={pictures}
              current={index}
              onSelect={showPicture}
            />
          </>
        )}

        <button
          type="button"
          aria-label={zoomed ? 'Zoom out' : 'Zoom in'}
          className={`${ROUND_BUTTON} absolute top-3 left-3 hidden lg:grid`}
          onClick={zoom.toggle}
        >
          <ZoomIcon zoomed={zoomed} />
        </button>
        {onClose && (
          <button
            type="button"
            aria-label="Close"
            className={`${ROUND_BUTTON} absolute top-3 right-3`}
            onClick={onClose}
          >
            ×
          </button>
        )}
        <p role="status" className="sr-only">
          {several
            ? `${map.title}, picture ${index + 1} of ${pictures.length}`
            : map.title}
        </p>
      </SwipeCarousel>

      <MapDetails
        map={map}
        titleId={titleId}
        heading={heading}
        scrollsInside={inWindow}
        canGrid={canGrid}
        showGrid={showGrid}
        onShowGrid={setShowGrid}
      />
    </Reveal>
  );
}

export { MapView };
