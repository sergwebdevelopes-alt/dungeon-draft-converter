import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { mapImages, type MapEntry } from '../model/catalog.ts';

const TILE =
  'group relative block w-full overflow-hidden rounded-2xl bg-sunken text-left ring-1 ring-white/5 transition-shadow duration-500 hover:shadow-[0_30px_60px_-25px_rgb(0_0_0/0.7)]';

const TILE_IMAGE =
  'size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]';

function squaresLabel({ squares }: MapEntry): string {
  return `${squares.x} × ${squares.y} squares`;
}

function TileImage({ map }: { map: MapEntry }) {
  return (
    <img
      src={mapImages(map.slug).card}
      alt=""
      width={640}
      height={800}
      loading="lazy"
      decoding="async"
      className={TILE_IMAGE}
    />
  );
}

interface TileCaptionProps {
  map: MapEntry;
  featured?: boolean;
}

function TileCaption({ map, featured = false }: TileCaptionProps) {
  return (
    <span className="pointer-events-none absolute inset-x-0 bottom-0 grid gap-1 bg-linear-to-t from-black/85 via-black/40 to-transparent p-4 pt-20 text-white sm:p-5 sm:pt-24">
      <strong
        className={`font-display leading-tight font-bold tracking-wide ${featured ? 'text-2xl sm:text-3xl' : 'text-lg sm:text-xl'}`}
      >
        {map.title}
      </strong>
      <span className="text-sm text-white/75">
        {map.subtitle} · {squaresLabel(map)}
      </span>
    </span>
  );
}

function TileFrame({ children }: { children: ReactNode }) {
  return <span className="absolute inset-0 block">{children}</span>;
}

function MapTileLink({ map }: { map: MapEntry }) {
  return (
    <Link to={`/maps?map=${map.slug}`} className={`${TILE} aspect-[4/5]`}>
      <TileFrame>
        <TileImage map={map} />
      </TileFrame>
      <TileCaption map={map} />
    </Link>
  );
}

export { MapTileLink, TILE, TileCaption, TileFrame, TileImage, squaresLabel };
