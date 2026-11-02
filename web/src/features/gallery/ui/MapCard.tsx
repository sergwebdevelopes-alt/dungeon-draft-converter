import type { Ref } from 'react';
import { SharedFrame } from '../../../shared/ui/motion/index.ts';
import { mapImages, type MapEntry } from '../model/catalog.ts';

interface MapCardProps {
  map: MapEntry;
  isOpen: boolean;
  buttonRef: Ref<HTMLButtonElement>;
  onOpen: () => void;
}

function squaresLabel({ squares }: MapEntry): string {
  return `${squares.x} × ${squares.y} squares`;
}

function MapCard({ map, isOpen, buttonRef, onOpen }: MapCardProps) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onOpen}
      className="group grid w-full gap-3 rounded-xl text-left"
    >
      <span className="block aspect-[4/5] overflow-hidden rounded-xl bg-sunken ring-1 ring-line">
        {!isOpen && (
          <SharedFrame layoutId={`map-${map.slug}`} className="size-full">
            <img
              src={mapImages(map.slug).card}
              alt=""
              width={640}
              height={800}
              loading="lazy"
              className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
          </SharedFrame>
        )}
      </span>
      <span className="grid gap-0.5">
        <strong className="font-display text-lg leading-tight tracking-wide">
          {map.title}
        </strong>
        <span className="text-sm text-muted">
          {map.subtitle} · {squaresLabel(map)}
        </span>
      </span>
    </button>
  );
}

export { MapCard, squaresLabel };
