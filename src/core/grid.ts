const GRID_STROKE = {
  color: 'black',
  opacity: 0.8,
  referenceGridSize: 140,
  width: 2.4,
  dashArray: [4.8, 3.2],
} as const;

const MAX_TILE_SQUARES = 10;
const DASH_ALIGNMENT_PX = 0.05;

function scaledStroke(gridSize: number): {
  width: number;
  dashArray: number[];
} {
  const scale = gridSize / GRID_STROKE.referenceGridSize;
  const scaled = (value: number): number => +(value * scale).toFixed(3);
  return {
    width: scaled(GRID_STROKE.width),
    dashArray: GRID_STROKE.dashArray.map(scaled),
  };
}

function gridTileSquares(gridSize: number): number | undefined {
  const period = scaledStroke(gridSize).dashArray.reduce((a, b) => a + b, 0);
  for (let squares = 1; squares <= MAX_TILE_SQUARES; squares++) {
    const length = squares * gridSize;
    const offset = length - Math.round(length / period) * period;
    if (Math.abs(offset) < DASH_ALIGNMENT_PX) {
      return squares;
    }
  }
  return undefined;
}

function createGridSvg(
  width: number,
  height: number,
  gridSize: number,
): string {
  const stroke = scaledStroke(gridSize);
  const strokeWidth = stroke.width;
  const dashArray = stroke.dashArray.join(' ');

  let lines = '';

  for (let x = 0; x <= width; x += gridSize) {
    lines += `<line x1="${x}" y1="0" x2="${x}" y2="${height}" />`;
  }

  for (let y = 0; y <= height; y += gridSize) {
    lines += `<line x1="0" y1="${y}" x2="${width}" y2="${y}" />`;
  }

  return `
    <svg width="${width}" height="${height}">
      <g
        stroke="${GRID_STROKE.color}"
        stroke-width="${strokeWidth}"
        stroke-opacity="${GRID_STROKE.opacity}"
        stroke-dasharray="${dashArray}"
        fill="none"
      >
        ${lines}
      </g>
    </svg>
  `;
}

export { GRID_STROKE, createGridSvg, gridTileSquares };
