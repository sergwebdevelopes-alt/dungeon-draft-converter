import { describe, expect, it } from 'vitest';
import {
  captionOf,
  findMap,
  hasSquares,
  neighbour,
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

describe('neighbour', () => {
  it('steps forward and back, wrapping at the ends when asked to', () => {
    expect(neighbour(LIST, 'a', 1, true)?.slug).toBe('b');
    expect(neighbour(LIST, 'c', 1, true)?.slug).toBe('a');
    expect(neighbour(LIST, 'a', -1, true)?.slug).toBe('c');
  });

  it('stops at the ends when the list is not complete', () => {
    expect(neighbour(LIST, 'b', 1, false)?.slug).toBe('c');
    expect(neighbour(LIST, 'c', 1, false)).toBeNull();
    expect(neighbour(LIST, 'a', -1, false)).toBeNull();
  });

  it('has no neighbour for a single or unknown map', () => {
    expect(neighbour([entry('a')], 'a', 1, true)).toBeNull();
    expect(neighbour(LIST, 'nope', 1, true)).toBeNull();
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
