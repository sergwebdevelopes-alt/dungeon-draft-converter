import { describe, expect, it } from 'vitest';
import { pageTitle } from './page-title.ts';

describe('pageTitle', () => {
  it('names the home page after the site and its tagline', () => {
    expect(pageTitle()).toBe(
      'Lair of Artificer · Battle maps for epic adventures',
    );
  });

  it('puts the page name before the site name', () => {
    expect(pageTitle('Converter')).toBe('Converter · Lair of Artificer');
  });
});
