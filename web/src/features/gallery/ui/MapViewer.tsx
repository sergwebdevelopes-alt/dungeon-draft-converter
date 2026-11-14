import type { CSSProperties, ReactNode } from 'react';
import type { Squares } from '@contracts/gallery-api.ts';
import { FadeImage } from '@/shared/ui/FadeImage.tsx';
import { GridOverlay } from '@/shared/ui/GridOverlay.tsx';
import { SharedFrame } from '@/shared/ui/motion/index.ts';
import { ZoomPan, type ZoomControls } from '@/shared/ui/ZoomPan.tsx';
import type { Picture } from '../model/catalog.ts';

interface MapViewerProps {
  picture: Picture;
  alt: string;
  grid?: Squares;
  morphId?: string;
  fade?: boolean;
  zoom?: ZoomControls;
}

const FRAME = 'relative overflow-hidden bg-surface';

function frameStyle({ width, height }: Picture): CSSProperties {
  const ratio = width / height;

  return {
    aspectRatio: `${width} / ${height}`,
    width: `min(100cqw, calc(100cqh * ${ratio}))`,
  };
}

function Frame({
  picture,
  morphId,
  children,
}: {
  picture: Picture;
  morphId?: string;
  children: ReactNode;
}) {
  if (morphId) {
    return (
      <SharedFrame
        layoutId={morphId}
        layoutKey={picture.view}
        className={FRAME}
        style={frameStyle(picture)}
      >
        {children}
      </SharedFrame>
    );
  }

  return (
    <div className={FRAME} style={frameStyle(picture)}>
      {children}
    </div>
  );
}

function MapViewer({
  picture,
  alt,
  grid,
  morphId,
  fade,
  zoom,
}: MapViewerProps) {
  return (
    <ZoomPan
      zoom={zoom}
      className="grid size-full place-items-center"
      style={{ containerType: 'size' }}
    >
      <Frame picture={picture} morphId={morphId}>
        <FadeImage
          key={picture.view}
          src={picture.view}
          alt={alt}
          fade={fade}
          className="size-full object-cover"
        />
        {grid && <GridOverlay columns={grid.x} rows={grid.y} />}
      </Frame>
    </ZoomPan>
  );
}

export { MapViewer };
