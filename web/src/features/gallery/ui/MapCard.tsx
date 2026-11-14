import type { Ref } from 'react';
import { Link } from 'react-router';
import { SharedFrame } from '@/shared/ui/motion/index.ts';
import { useOpenMap } from '../hooks/useOpenMap.ts';
import type { MapEntry } from '../model/catalog.ts';
import { TILE, TileCaption, TileFrame, TileImage } from './MapTile.tsx';

interface MapCardProps {
  map: MapEntry;
  isOpen: boolean;
  featured?: boolean;
  cardRef: Ref<HTMLAnchorElement>;
}

function MapCard({ map, isOpen, featured = false, cardRef }: MapCardProps) {
  const { windowState } = useOpenMap();

  return (
    <Link
      ref={cardRef}
      to={map.path}
      state={windowState(map, true)}
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
    </Link>
  );
}

export { MapCard };
