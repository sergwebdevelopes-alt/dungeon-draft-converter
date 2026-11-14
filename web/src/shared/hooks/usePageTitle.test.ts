import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { usePageTitle } from './usePageTitle.ts';

describe('usePageTitle', () => {
  afterEach(() => {
    document.title = '';
  });

  it('names the tab as asked', () => {
    renderHook(() => usePageTitle('Maps · Lair of Artificer'));

    expect(document.title).toBe('Maps · Lair of Artificer');
  });

  it('follows the page when it changes, without adding title elements', () => {
    const { rerender } = renderHook((title: string) => usePageTitle(title), {
      initialProps: 'Maps',
    });

    rerender('Converter');

    expect(document.title).toBe('Converter');
    expect(document.querySelectorAll('title')).toHaveLength(1);
  });

  it('leaves the title alone while it is turned off, and sets it once turned on', () => {
    document.title = 'Ice Cave';
    const { rerender } = renderHook(
      (enabled: boolean) => usePageTitle('Maps', { enabled }),
      { initialProps: false },
    );

    expect(document.title).toBe('Ice Cave');

    rerender(true);

    expect(document.title).toBe('Maps');
  });
});
