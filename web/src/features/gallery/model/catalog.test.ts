import { describe, expect, it } from 'vitest';
import {
  captionOf,
  filterMaps,
  findMap,
  hasSquares,
  neighbour,
  tagsOf,
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

describe('tagsOf', () => {
  it('lists each tag once, in the order maps use them', () => {
    expect(
      tagsOf([
        entry('a', ['Underground']),
        entry('b', ['Interior', 'Underground']),
      ]),
    ).toEqual(['Underground', 'Interior']);
  });
});

describe('filterMaps', () => {
  it('keeps every map without a tag and only matching ones with a tag', () => {
    expect(filterMaps(LIST, null)).toBe(LIST);
    expect(filterMaps(LIST, 'Outdoor').map((m) => m.slug)).toEqual(['b']);
  });
});

describe('findMap', () => {
  it('finds a map by slug', () => {
    expect(findMap(LIST, 'b')?.slug).toBe('b');
    expect(findMap(LIST, 'nope')).toBeNull();
    expect(findMap(LIST, null)).toBeNull();
  });
});

describe('neighbour', () => {
  it('steps forward and back, wrapping at the ends', () => {
    expect(neighbour(LIST, 'a', 1)?.slug).toBe('b');
    expect(neighbour(LIST, 'c', 1)?.slug).toBe('a');
    expect(neighbour(LIST, 'a', -1)?.slug).toBe('c');
  });

  it('has no neighbour for a single or unknown map', () => {
    expect(neighbour([entry('a')], 'a', 1)).toBeNull();
    expect(neighbour(LIST, 'nope', 1)).toBeNull();
  });
});

describe('captionOf', () => {
  it('joins the subtitle and the size that a map has', () => {
    const map = entry('a');

    expect(
      captionOf({
        ...map,
        subtitle: 'Curse of Strahd',
        squares: { x: 60, y: 40 },
      }),
    ).toBe('Curse of Strahd · 60 × 40 squares');
    expect(captionOf({ ...map, squares: { x: 60, y: 40 } })).toBe(
      '60 × 40 squares',
    );
    expect(captionOf({ ...map, subtitle: 'Curse of Strahd' })).toBe(
      'Curse of Strahd',
    );
    expect(captionOf(map)).toBe('');
  });
});

describe('hasSquares', () => {
  it('tells maps with a known size apart', () => {
    expect(hasSquares({ ...entry('a'), squares: { x: 1, y: 1 } })).toBe(true);
    expect(hasSquares(entry('a'))).toBe(false);
  });
});
