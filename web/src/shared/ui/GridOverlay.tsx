import { GRID_STROKE } from '../../../../src/core/grid.ts';

type GridStyle = 'export' | 'highlight';

interface GridOverlayProps {
  columns: number;
  rows: number;
  look?: GridStyle;
  className?: string;
}

function perSquare(px: number): number {
  return px / GRID_STROKE.referenceGridSize;
}

function range(from: number, to: number): number[] {
  return Array.from({ length: Math.max(to - from + 1, 0) }, (_, i) => from + i);
}

function strokeProps(look: GridStyle) {
  if (look === 'highlight') {
    return {
      stroke: 'white',
      strokeOpacity: 0.7,
      strokeWidth: 1,
      strokeDasharray: '3 3',
      vectorEffect: 'non-scaling-stroke' as const,
    };
  }

  return {
    stroke: GRID_STROKE.color,
    strokeOpacity: GRID_STROKE.opacity,
    strokeWidth: perSquare(GRID_STROKE.width),
    strokeDasharray: GRID_STROKE.dashArray.map(perSquare).join(' '),
    vectorEffect: undefined,
  };
}

function GridOverlay({
  columns,
  rows,
  look = 'export',
  className = '',
}: GridOverlayProps) {
  const { vectorEffect, ...stroke } = strokeProps(look);
  const edges = look === 'export' ? 0 : 1;
  const xs = range(edges, columns - edges);
  const ys = range(edges, rows - edges);

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${columns} ${rows}`}
      preserveAspectRatio="none"
      className={`pointer-events-none absolute inset-0 size-full ${className}`}
    >
      <g {...stroke} fill="none">
        {xs.map((x) => (
          <line
            key={`x${x}`}
            x1={x}
            y1={0}
            x2={x}
            y2={rows}
            vectorEffect={vectorEffect}
          />
        ))}
        {ys.map((y) => (
          <line
            key={`y${y}`}
            x1={0}
            y1={y}
            x2={columns}
            y2={y}
            vectorEffect={vectorEffect}
          />
        ))}
      </g>
    </svg>
  );
}

export { GridOverlay };
export type { GridStyle };
