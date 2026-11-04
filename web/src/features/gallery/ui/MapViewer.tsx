import type { CSSProperties, ReactNode } from 'react';
import { FadeImage } from '../../../shared/ui/FadeImage.tsx';
import { GridOverlay } from '../../../shared/ui/GridOverlay.tsx';
import { SharedFrame } from '../../../shared/ui/motion/index.ts';
import type { MapEntry } from '../model/catalog.ts';

interface MapViewerProps {
  map: MapEntry;
  showGrid: boolean;
  morph: boolean;
}

const FRAME = 'relative overflow-hidden rounded-lg bg-surface shadow-2xl';

function frameStyle({ width, height }: MapEntry): CSSProperties {
  const ratio = width / height;

  return {
    aspectRatio: `${width} / ${height}`,
    width: `min(100cqw, calc(100cqh * ${ratio}))`,
  };
}

function Frame({
  map,
  morph,
  children,
}: {
  map: MapEntry;
  morph: boolean;
  children: ReactNode;
}) {
  if (morph) {
    return (
      <SharedFrame
        layoutId={`map-${map.slug}`}
        className={FRAME}
        style={frameStyle(map)}
      >
        {children}
      </SharedFrame>
    );
  }

  return (
    <div className={FRAME} style={frameStyle(map)}>
      {children}
    </div>
  );
}

function MapViewer({ map, showGrid, morph }: MapViewerProps) {
  return (
    <div
      className="grid size-full place-items-center"
      style={{ containerType: 'size' }}
    >
      <Frame map={map} morph={morph}>
        <FadeImage
          key={map.images.view}
          src={map.images.view}
          alt={[map.title, map.subtitle].filter(Boolean).join(', ')}
          className="size-full object-cover"
        />
        {showGrid && map.squares && (
          <GridOverlay columns={map.squares.x} rows={map.squares.y} />
        )}
      </Frame>
    </div>
  );
}

export { MapViewer };
