import type { PlanPrice } from '../../../shared/config/site.ts';

function formatPrice({ cents, currency }: PlanPrice, locale = 'en-US'): string {
  const whole = cents % 100 === 0;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function periodLabel({ period }: PlanPrice): string {
  return `per ${period}`;
}

export { formatPrice, periodLabel };
