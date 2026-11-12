import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { MapEntry } from '../model/catalog.ts';
import { usePictureBrowser } from './usePictureBrowser.ts';

function picture(name: string) {
  return {
    view: `/${name}/view.webp`,
    thumb: `/${name}/thumb.webp`,
    width: 2,
    height: 1,
  };
}

const SINGLE: MapEntry = {
  slug: 'cave',
  title: 'Cave',
  tags: [],
  width: 2000,
  height: 1000,
  patreonUrl: 'https://example.com',
  images: { card: '/cave/card.webp', view: '/cave/view.webp', backdrop: '/b' },
};

const CASTLE: MapEntry = {
  ...SINGLE,
  slug: 'castle',
  pictures: [picture('hall'), picture('roof'), picture('cellar')],
};

function browse(map: MapEntry) {
  return renderHook(() => usePictureBrowser(map)).result;
}

describe('usePictureBrowser', () => {
  it('starts on the first picture, not moved yet', () => {
    const browser = browse(CASTLE);

    expect(browser.current.index).toBe(0);
    expect(browser.current.picture.view).toBe('/hall/view.webp');
    expect(browser.current.several).toBe(true);
    expect(browser.current.moved).toBe(false);
  });

  it('goes round the pictures in both directions', () => {
    const browser = browse(CASTLE);

    act(() => browser.current.showPrevious());
    expect(browser.current.index).toBe(2);
    expect(browser.current.position).toBe(-1);
    expect(browser.current.picture.view).toBe('/cellar/view.webp');

    act(() => browser.current.showNext());
    act(() => browser.current.showNext());
    expect(browser.current.index).toBe(1);

    act(() => browser.current.showNext());
    act(() => browser.current.showNext());
    expect(browser.current.index).toBe(0);
    expect(browser.current.position).toBe(3);
    expect(browser.current.moved).toBe(true);
  });

  it('tells which picture sits at any position, before the first and after the last', () => {
    const browser = browse(CASTLE);

    expect(browser.current.pictureAt(-1).view).toBe('/cellar/view.webp');
    expect(browser.current.pictureAt(1).view).toBe('/roof/view.webp');
    expect(browser.current.pictureAt(3).view).toBe('/hall/view.webp');
  });

  it('jumps to a picked picture by the shortest count from where it is', () => {
    const browser = browse(CASTLE);
    act(() => browser.current.showPrevious());

    act(() => browser.current.showPicture(1));

    expect(browser.current.index).toBe(1);
    expect(browser.current.position).toBe(-2);
  });

  it('does not count picking the open picture as moving', () => {
    const browser = browse(CASTLE);

    act(() => browser.current.showPicture(0));

    expect(browser.current.position).toBe(0);
    expect(browser.current.moved).toBe(false);
  });

  it('gives a map with one image its cover as the only picture', () => {
    const browser = browse(SINGLE);

    expect(browser.current.several).toBe(false);
    expect(browser.current.pictures).toEqual([
      { view: '/cave/view.webp', width: 2000, height: 1000 },
    ]);

    act(() => browser.current.showNext());
    expect(browser.current.picture.view).toBe('/cave/view.webp');
  });
});
