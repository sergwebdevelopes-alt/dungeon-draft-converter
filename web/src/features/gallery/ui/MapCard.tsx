import type { Ref } from 'react';
import { SharedFrame } from '../../../shared/ui/motion/index.ts';
import type { MapEntry } from '../model/catalog.ts';
import { TILE, TileCaption, TileFrame, TileImage } from './MapTile.tsx';

interface MapCardProps {
  map: MapEntry;
  isOpen: boolean;
  featured?: boolean;
  buttonRef: Ref<HTMLButtonElement>;
  onOpen: () => void;
}

function MapCard({
  map,
  isOpen,
  featured = false,
  buttonRef,
  onOpen,
}: MapCardProps) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onOpen}
      className={`${TILE} ${featured ? 'h-full min-h-80' : 'aspect-[4/5]'}`}
    >
      <TileFrame>
        {!isOpen && (
          <SharedFrame layoutId={`map-${map.slug}`} className="size-full">
            <TileImage map={map} />
          </SharedFrame>
        )}
      </TileFrame>
      <TileCaption map={map} featured={featured} />
    </button>
  );
}

export { MapCard };
