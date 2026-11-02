import { describe, expect, it } from 'vitest';
import { choiceOf, variantsFor } from './grid-choice.ts';

describe('grid choice', () => {
  it('turns a choice into the variants to export', () => {
    expect(variantsFor('without')).toEqual(['NoGrid']);
    expect(variantsFor('with')).toEqual(['Grid']);
    expect(variantsFor('both')).toEqual(['NoGrid', 'Grid']);
  });

  it('reads the choice back from saved variants in any order', () => {
    expect(choiceOf(['Grid', 'NoGrid'])).toBe('both');
    expect(choiceOf(['Grid'])).toBe('with');
    expect(choiceOf(['NoGrid'])).toBe('without');
    expect(choiceOf([])).toBeNull();
  });
});
