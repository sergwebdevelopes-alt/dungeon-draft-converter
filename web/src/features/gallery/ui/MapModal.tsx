import {
  useId,
  useRef,
  useState,
  type MouseEvent,
  type SyntheticEvent,
} from 'react';
import { useArrowKeys } from '@/shared/lib/useArrowKeys.ts';
import { useLoadedImages } from '@/shared/lib/useLoadedImages.ts';
import { useModalDialog } from '@/shared/lib/useModalDialog.ts';
import { useScrollLock } from '@/shared/lib/useScrollLock.ts';
import { useZoom } from '@/shared/lib/useZoom.ts';
import { isZoomed } from '@/shared/lib/zoom.ts';
import { Reveal, SwipeCarousel } from '@/shared/ui/motion/index.ts';
import { usePictureBrowser } from '../hooks/usePictureBrowser.ts';
import { gridFits, type MapEntry } from '../model/catalog.ts';
import { MapDetails } from './MapDetails.tsx';
import { MapViewer } from './MapViewer.tsx';
import { PictureStrip } from './PictureStrip.tsx';

interface MapModalProps {
  map: MapEntry;
  morph: boolean;
  onClose: () => void;
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

function MapModal({ map, morph, onClose }: MapModalProps) {
  const dialogRef = useModalDialog();
  const titleId = useId();
  useScrollLock();
  const [showGrid, setShowGrid] = useState(false);
  const browser = usePictureBrowser(map);
  const { pictures, several, position, index, picture, pictureAt } = browser;
  const { showPrevious, showNext, showPicture } = browser;

  const canGrid = map.squares !== undefined && gridFits(picture, map.squares);
  const alt = [map.title, map.subtitle].filter(Boolean).join(', ');
  const morphs = morph && !browser.moved;

  const zoom = useZoom(position);
  const [pinching, setPinching] = useState(false);
  const pressedBackdrop = useRef(false);
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
                }
              : undefined
          }
        />
      ),
    };
  }

  function handleCancel(event: SyntheticEvent) {
    event.preventDefault();
    onClose();
  }

  function handleBackdropPress(event: MouseEvent) {
    pressedBackdrop.current = event.target === event.currentTarget;
  }

  function handleBackdropClick(event: MouseEvent) {
    if (pressedBackdrop.current && event.target === event.currentTarget) {
      onClose();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={handleCancel}
      onMouseDown={handleBackdropPress}
      onClick={handleBackdropClick}
      className="m-auto h-dvh max-h-none w-full max-w-none overflow-hidden bg-transparent p-0 text-text backdrop:bg-black/75 backdrop:backdrop-blur-sm sm:h-[min(92dvh,920px)] sm:w-[min(94vw,1280px)]"
    >
      <Reveal className="grid h-full grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-surface sm:rounded-2xl sm:ring-1 sm:ring-line lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-1">
        <SwipeCarousel
          className="relative h-[75dvh] min-h-0 w-full bg-sunken lg:h-auto"
          previous={several ? slide(position - 1) : null}
          current={slide(position)}
          next={several ? slide(position + 1) : null}
          onPrevious={showPrevious}
          onNext={showNext}
          onDismiss={onClose}
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
          <button
            type="button"
            aria-label="Close"
            className={`${ROUND_BUTTON} absolute top-3 right-3`}
            onClick={onClose}
          >
            ×
          </button>
          <p role="status" className="sr-only">
            {several
              ? `${map.title}, picture ${index + 1} of ${pictures.length}`
              : map.title}
          </p>
        </SwipeCarousel>

        <MapDetails
          map={map}
          titleId={titleId}
          canGrid={canGrid}
          showGrid={showGrid}
          onShowGrid={setShowGrid}
        />
      </Reveal>
    </dialog>
  );
}

export { MapModal };
