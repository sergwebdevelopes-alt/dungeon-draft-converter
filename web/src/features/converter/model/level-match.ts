interface LevelGrid {
  originX: number;
  originY: number;
  columns: number;
  rows: number;
  pixelsPerSquare: number;
}

interface NamedLevel {
  name: string;
  grid: LevelGrid;
}

function sameSize(level: LevelGrid, main: LevelGrid): boolean {
  return (
    level.columns === main.columns &&
    level.rows === main.rows &&
    level.pixelsPerSquare === main.pixelsPerSquare
  );
}

function sameOrigin(level: LevelGrid, main: LevelGrid): boolean {
  return level.originX === main.originX && level.originY === main.originY;
}

function sizeLabel({ columns, rows, pixelsPerSquare }: LevelGrid): string {
  return `${columns} × ${rows} squares at ${pixelsPerSquare} px per square`;
}

function mismatchWithMain(level: NamedLevel, main: NamedLevel): string | null {
  if (!sameSize(level.grid, main.grid)) {
    return `"${level.name}" is ${sizeLabel(level.grid)}, but the main map "${main.name}" is ${sizeLabel(main.grid)}. Levels must be exports of the same map at the same size.`;
  }
  if (!sameOrigin(level.grid, main.grid)) {
    return `"${level.name}" starts at a different point of the grid than the main map "${main.name}". Levels must be exports of the same map.`;
  }

  return null;
}

function levelMismatch(levels: NamedLevel[]): string | null {
  const [main, ...lower] = levels;
  for (const level of lower) {
    const mismatch = mismatchWithMain(level, main);
    if (mismatch) {
      return mismatch;
    }
  }

  return null;
}

export { levelMismatch };
export type { LevelGrid, NamedLevel };
