import type { Variant } from './types.ts';

type GridChoice = 'without' | 'with' | 'both';

const VARIANTS: Record<GridChoice, Variant[]> = {
  without: ['NoGrid'],
  with: ['Grid'],
  both: ['NoGrid', 'Grid'],
};

function variantsFor(choice: GridChoice): Variant[] {
  return VARIANTS[choice];
}

function choiceOf(variants: Variant[]): GridChoice | null {
  const hasGrid = variants.includes('Grid');
  const hasNoGrid = variants.includes('NoGrid');
  if (hasGrid && hasNoGrid) {
    return 'both';
  }
  if (hasGrid) {
    return 'with';
  }

  return hasNoGrid ? 'without' : null;
}

export { choiceOf, variantsFor };
export type { GridChoice };
