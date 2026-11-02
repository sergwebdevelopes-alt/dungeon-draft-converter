import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type SyntheticEvent,
} from 'react';
import { ExternalLink } from '../../../shared/ui/ExternalLink.tsx';
import { Reveal, Swipeable } from '../../../shared/ui/motion/index.ts';
import { mapImages, type MapEntry } from '../model/catalog.ts';
import { squaresLabel } from './MapCard.tsx';
import { MapViewer } from './MapViewer.tsx';

interface MapModalProps {
  map: MapEntry;
  morph: boolean;
  position: { index: number; total: number };
  neighbours: MapEntry[];
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}

const ROUND_BUTTON =
  'grid size-11 place-items-center rounded-full bg-black/55 text-xl text-white ring-1 ring-white/15 backdrop-blur transition hover:bg-black/75';

const SEGMENT =
  'min-h-11 rounded-lg px-3 text-sm font-bold text-muted transition-colors aria-pressed:bg-surface aria-pressed:text-text aria-pressed:shadow';

function useModalDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  return dialogRef;
}

function useArrowKeys(
  enabled: boolean,
  onPrevious: () => void,
  onNext: () => void,
) {
  const latest = useRef({ onPrevious, onNext });
  latest.current = { onPrevious, onNext };

  useEffect(() => {
    if (!enabled) {
      return;
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.target instanceof HTMLInputElement) {
        return;
      }
      if (event.key === 'ArrowLeft') {
        latest.current.onPrevious();
      }
      if (event.key === 'ArrowRight') {
        latest.current.onNext();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
}

function usePreload(maps: MapEntry[]) {
  useEffect(() => {
    for (const map of maps) {
      new Image().src = mapImages(map.slug).view;
    }
  }, [maps]);
}

function MapModal({
  map,
  morph,
  position,
  neighbours,
  onClose,
  onPrevious,
  onNext,
}: MapModalProps) {
  const dialogRef = useModalDialog();
  const titleId = useId();
  const [showGrid, setShowGrid] = useState(false);
  const canMove = position.total > 1;

  useArrowKeys(canMove, onPrevious, onNext);
  usePreload(neighbours);

  function handleCancel(event: SyntheticEvent) {
    event.preventDefault();
    onClose();
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      className="m-auto h-dvh max-h-none w-full max-w-none bg-transparent p-0 text-text backdrop:bg-black/75 backdrop:backdrop-blur-sm sm:h-[min(92dvh,920px)] sm:w-[min(94vw,1280px)]"
    >
      <Reveal className="relative grid h-full grid-rows-[minmax(0,1fr)_auto] overflow-hidden bg-surface sm:rounded-2xl sm:ring-1 sm:ring-line lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-1">
        <Swipeable
          className="relative grid min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-3 bg-sunken p-3 sm:p-6"
          onSwipeLeft={onNext}
          onSwipeRight={onPrevious}
          onSwipeDown={onClose}
        >
          <MapViewer map={map} showGrid={showGrid} morph={morph} />

          {canMove && (
            <>
              <button
                type="button"
                aria-label="Previous map"
                className={`${ROUND_BUTTON} absolute top-1/2 left-3 -translate-y-1/2 sm:left-5`}
                onClick={onPrevious}
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Next map"
                className={`${ROUND_BUTTON} absolute top-1/2 right-3 -translate-y-1/2 sm:right-5`}
                onClick={onNext}
              >
                ›
              </button>
            </>
          )}

          <p className="justify-self-center rounded-full bg-black/45 px-3 py-1 text-sm text-white tabular-nums">
            {position.index + 1} of {position.total}
          </p>
        </Swipeable>

        <div className="grid content-start gap-5 border-t border-line p-4 sm:p-6 lg:border-t-0 lg:border-l">
          <div className="grid min-h-[5.25rem] content-start gap-1 pr-12">
            <h2
              id={titleId}
              className="line-clamp-2 font-display text-xl leading-tight font-bold tracking-wide sm:text-2xl lg:text-xl"
            >
              {map.title}
            </h2>
            <p className="text-muted">
              {map.subtitle} · {squaresLabel(map)}
            </p>
          </div>

          <ul className="flex flex-wrap gap-2" aria-label="Tags">
            {map.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-line px-3 py-1 text-xs font-bold tracking-wide text-muted uppercase"
              >
                {tag}
              </li>
            ))}
          </ul>

          <div
            role="group"
            aria-label="Grid"
            className="grid grid-cols-2 gap-1 rounded-xl bg-sunken p-1"
          >
            <button
              type="button"
              className={SEGMENT}
              aria-pressed={!showGrid}
              onClick={() => setShowGrid(false)}
            >
              Without grid
            </button>
            <button
              type="button"
              className={SEGMENT}
              aria-pressed={showGrid}
              onClick={() => setShowGrid(true)}
            >
              With grid
            </button>
          </div>

          <ExternalLink
            href={map.patreonUrl}
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-gold px-5 font-bold text-on-gold hover:brightness-105"
          >
            Get it on Patreon
          </ExternalLink>
        </div>

        <button
          type="button"
          aria-label="Close"
          className={`${ROUND_BUTTON} absolute top-3 right-3 z-10`}
          onClick={onClose}
        >
          ×
        </button>
      </Reveal>
    </dialog>
  );
}

export { MapModal };
