import { render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PageTitle, pageTitle } from './PageTitle.tsx';

describe('PageTitle', () => {
  afterEach(() => {
    document.title = '';
  });

  it('names the home page after the site and its tagline', () => {
    render(<PageTitle />);

    expect(document.title).toBe(
      'Lair of Artificer · Battle maps for epic adventures',
    );
  });

  it('puts the page name before the site name', () => {
    render(<PageTitle title="Maps" />);

    expect(document.title).toBe('Maps · Lair of Artificer');
  });

  it('follows the page when it changes, without adding title elements', () => {
    const { rerender } = render(<PageTitle title="Maps" />);

    rerender(<PageTitle title="Converter" />);

    expect(document.title).toBe('Converter · Lair of Artificer');
    expect(document.querySelectorAll('title')).toHaveLength(1);
  });

  it('builds the same titles for code that needs them as text', () => {
    expect(pageTitle()).toBe(
      'Lair of Artificer · Battle maps for epic adventures',
    );
    expect(pageTitle('Converter')).toBe('Converter · Lair of Artificer');
  });
});
