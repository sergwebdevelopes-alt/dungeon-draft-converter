import { describe, expect, it } from 'vitest';
import { formatPrice, periodLabel } from './price.ts';

describe('formatPrice', () => {
  it('drops cents for whole amounts', () => {
    expect(formatPrice({ cents: 500, currency: 'USD', period: 'month' })).toBe(
      '$5',
    );
  });

  it('keeps cents when there are some', () => {
    expect(formatPrice({ cents: 450, currency: 'EUR', period: 'month' })).toBe(
      '€4.50',
    );
  });

  it('names the billing period', () => {
    expect(periodLabel({ cents: 500, currency: 'USD', period: 'year' })).toBe(
      'per year',
    );
  });
});
