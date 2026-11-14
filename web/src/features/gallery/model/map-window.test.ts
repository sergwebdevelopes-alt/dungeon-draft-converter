import { describe, expect, it } from 'vitest';
import type { MapEntry } from './catalog.ts';
import {
  mapWindowState,
  openedMapWindow,
  type PageLocation,
} from './map-window.ts';

const CAVE = { slug: 'cave', path: '/maps/caves/cave' } as MapEntry;

function at(pathname: string, state: unknown = null): PageLocation {
  return { pathname, search: '', hash: '', state, key: pathname };
}

describe('openedMapWindow', () => {
  const gallery = at('/maps');

  it('finds the page under the window and the map opened in this visit', () => {
    const state = mapWindowState(gallery, CAVE, true);

    expect(openedMapWindow(at(CAVE.path, state))).toEqual({
      background: gallery,
      map: CAVE,
      morph: true,
    });
  });

  it('opens no window for a state left by an earlier visit', () => {
    const state = {
      ...mapWindowState(gallery, CAVE, true),
      visit: 'an earlier visit',
    };

    expect(openedMapWindow(at(CAVE.path, state))).toBeNull();
  });

  it('opens no window without a state, a page under it or a map', () => {
    const { visit } = mapWindowState(gallery, CAVE, false);

    expect(openedMapWindow(at(CAVE.path))).toBeNull();
    expect(openedMapWindow(at(CAVE.path, { visit, map: CAVE }))).toBeNull();
    expect(
      openedMapWindow(at(CAVE.path, { visit, background: gallery })),
    ).toBeNull();
  });

  it('flies the picture out of a card only when asked to', () => {
    const state = mapWindowState(gallery, CAVE, false);

    expect(openedMapWindow(at(CAVE.path, state))?.morph).toBe(false);
  });
});
