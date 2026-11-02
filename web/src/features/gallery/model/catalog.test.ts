import { describe, expect, it } from 'vitest';
import {
  filterMaps,
  findMap,
  mapImages,
  neighbour,
  tagsOf,
  type MapEntry,
} from './catalog.ts';

function entry(slug: string, tags: MapEntry['tags'] = ['Interior']): MapEntry {
  return {
    slug,
    title: slug,
    subtitle: '',
    squares: { x: 10, y: 10 },
    tags,
    patreonUrl: 'https://example.com',
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

describe('mapImages', () => {
  it('points at the generated images', () => {
    expect(mapImages('frozen-cavern')).toEqual({
      card: '/maps/frozen-cavern/card.webp',
      view: '/maps/frozen-cavern/view.webp',
      viewGrid: '/maps/frozen-cavern/view-grid.webp',
      backdrop: '/maps/frozen-cavern/backdrop.webp',
    });
  });
});
