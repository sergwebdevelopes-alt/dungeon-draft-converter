import { describe, expect, it } from 'vitest';
import {
  mapCaption,
  findMap,
  gridFits,
  mapPictures,
  picturesLabel,
  wrapIndex,
  type MapEntry,
} from './catalog.ts';

function entry(slug: string, tags: MapEntry['tags'] = ['Interior']): MapEntry {
  return {
    slug,
    title: slug,
    tags,
    width: 1000,
    height: 1000,
    patreonUrl: 'https://example.com',
    images: { card: 'c', view: 'v', backdrop: 'b' },
  };
}

const LIST = [entry('a'), entry('b', ['Outdoor']), entry('c')];

describe('findMap', () => {
  it('finds a map by slug', () => {
    expect(findMap(LIST, 'b')?.slug).toBe('b');
    expect(findMap(LIST, 'nope')).toBeNull();
    expect(findMap(LIST, null)).toBeNull();
  });
});

const LEVELS: MapEntry = {
  ...entry('castle'),
  width: 2000,
  height: 3000,
  pictures: [
    { view: 'v1', thumb: 't1', width: 2000, height: 3000 },
    { view: 'v2', thumb: 't2', width: 4000, height: 3000 },
  ],
};

describe('mapPictures', () => {
  it('lists the pictures of a map with several', () => {
    expect(mapPictures(LEVELS)).toBe(LEVELS.pictures);
  });

  it('gives the cover as the only picture of other maps', () => {
    expect(mapPictures(entry('a'))).toEqual([
      { view: 'v', width: 1000, height: 1000 },
    ]);
  });
});

describe('picturesLabel', () => {
  it('counts the levels of a map with several pictures', () => {
    expect(picturesLabel(LEVELS)).toBe('2 levels');
  });

  it('says nothing for a map with one picture', () => {
    expect(picturesLabel(entry('a'))).toBeNull();
    expect(
      picturesLabel({ ...LEVELS, pictures: LEVELS.pictures?.slice(0, 1) }),
    ).toBeNull();
  });
});

describe('gridFits', () => {
  const squares = { x: 20, y: 30 };

  it('fits a picture with the proportions of the grid', () => {
    expect(gridFits({ view: 'v', width: 2000, height: 3000 }, squares)).toBe(
      true,
    );
    expect(gridFits({ view: 'v', width: 2800, height: 4201 }, squares)).toBe(
      true,
    );
  });

  it('does not fit a picture with other proportions', () => {
    expect(gridFits({ view: 'v', width: 3000, height: 2000 }, squares)).toBe(
      false,
    );
    expect(gridFits({ view: 'v', width: 2000, height: 2900 }, squares)).toBe(
      false,
    );
  });
});

describe('wrapIndex', () => {
  it('goes round the list in both directions', () => {
    expect([0, 1, 2, 3, 4, 7].map((at) => wrapIndex(at, 3))).toEqual([
      0, 1, 2, 0, 1, 1,
    ]);
    expect([-1, -2, -3, -4].map((at) => wrapIndex(at, 3))).toEqual([
      2, 1, 0, 2,
    ]);
    expect(wrapIndex(5, 1)).toBe(0);
  });
});

describe('mapCaption', () => {
  it('joins the subtitle and the size that a map has', () => {
    const map = entry('a');

    expect(
      mapCaption({
        ...map,
        subtitle: 'Curse of Strahd',
        squares: { x: 60, y: 40 },
      }),
    ).toBe('Curse of Strahd · 60 × 40 squares');
    expect(mapCaption({ ...map, squares: { x: 60, y: 40 } })).toBe(
      '60 × 40 squares',
    );
    expect(mapCaption({ ...map, subtitle: 'Curse of Strahd' })).toBe(
      'Curse of Strahd',
    );
    expect(mapCaption(map)).toBe('');
  });
});
