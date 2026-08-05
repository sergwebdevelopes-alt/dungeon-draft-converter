const GRID_STROKE = {
  color: 'black',
  opacity: 0.8,
  referenceGridSize: 140,
  width: 2.4,
  dashArray: [4.8, 3.2],
} as const;

function createGridSvg(
  width: number,
  height: number,
  gridSize: number,
): string {
  const scale = gridSize / GRID_STROKE.referenceGridSize;
  const scaled = (value: number): number => +(value * scale).toFixed(3);
  const strokeWidth = scaled(GRID_STROKE.width);
  const dashArray = GRID_STROKE.dashArray.map(scaled).join(' ');

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

export { GRID_STROKE, createGridSvg };
