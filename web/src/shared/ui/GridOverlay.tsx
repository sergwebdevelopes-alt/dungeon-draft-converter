interface GridOverlayProps {
  columns: number;
  rows: number;
  className?: string;
}

function lines(count: number): number[] {
  return Array.from({ length: Math.max(count - 1, 0) }, (_, i) => i + 1);
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
        stroke="white"
        strokeOpacity="0.7"
        strokeWidth="1"
        strokeDasharray="3 3"
        vectorEffect="non-scaling-stroke"
      >
        {lines(columns).map((x) => (
          <line
            key={`x${x}`}
            x1={x}
            y1={0}
            x2={x}
            y2={rows}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {lines(rows).map((y) => (
          <line
            key={`y${y}`}
            x1={0}
            y1={y}
            x2={columns}
            y2={y}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
    </svg>
  );
}

export { GridOverlay };
