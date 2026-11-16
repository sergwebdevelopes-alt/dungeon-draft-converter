import { describe, expect, it } from 'vitest';
import { SITE } from './site.ts';

describe('SITE', () => {
  it('reports errors and counts visits on the same live address only', () => {
    expect(SITE.errorReporting?.hostname).toBe('lairofartificer.com');
    expect(SITE.analytics?.hostname).toBe(SITE.errorReporting?.hostname);
  });

  it('sends error reports to Sentry, which the site is allowed to reach', () => {
    const address = new URL(SITE.errorReporting?.dsn ?? '');

    expect(address.protocol).toBe('https:');
    expect(address.hostname.endsWith('.sentry.io')).toBe(true);
    expect(address.username).not.toBe('');
    expect(address.pathname).toMatch(/^\/\d+$/);
  });
});
