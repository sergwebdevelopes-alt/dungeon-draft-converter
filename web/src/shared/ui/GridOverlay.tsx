import { GRID_STROKE } from '../../../../src/core/grid-stroke.ts';

interface GridOverlayProps {
  columns: number;
  rows: number;
  className?: string;
}

function perSquare(px: number): number {
  return px / GRID_STROKE.referenceGridSize;
}

function range(to: number): number[] {
  return Array.from({ length: Math.max(to + 1, 0) }, (_, i) => i);
}

function GridOverlay({ columns, rows, className = '' }: GridOverlayProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${columns} ${rows}`}
      preserveAspectRatio="none"
      className={`pointer-events-none absolute inset-0 size-full ${className}`}
    >
      <g
        stroke={GRID_STROKE.color}
        strokeOpacity={GRID_STROKE.opacity}
        strokeWidth={perSquare(GRID_STROKE.width)}
        strokeDasharray={GRID_STROKE.dashArray.map(perSquare).join(' ')}
        fill="none"
      >
        {range(columns).map((x) => (
          <line key={`x${x}`} x1={x} y1={0} x2={x} y2={rows} />
        ))}
        {range(rows).map((y) => (
          <line key={`y${y}`} x1={0} y1={y} x2={columns} y2={y} />
        ))}
      </g>
    </svg>
  );
}

export { GridOverlay };
