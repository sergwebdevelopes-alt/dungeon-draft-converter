import { describe, expect, it } from 'vitest';
import type { MapEntry } from './catalog.ts';
import {
  canLoadMore,
  firstPage,
  hasMore,
  initialPages,
  isComplete,
  nextPage,
  pagesReducer,
  type PageRequest,
  type PagesState,
} from './map-pages.ts';

function entry(slug: string): MapEntry {
  return {
    slug,
    title: slug,
    tags: [],
    width: 1000,
    height: 1000,
    patreonUrl: 'https://example.com',
    images: { card: 'c', view: 'v', backdrop: 'b' },
  };
}

function entries(...slugs: string[]): MapEntry[] {
  return slugs.map(entry);
}

function loaded(
  state: PagesState,
  request: PageRequest,
  slugs: string[],
  total = 5,
): PagesState {
  return pagesReducer(state, {
    type: 'pageLoaded',
    request,
    page: { maps: entries(...slugs), total, tags: ['Waterdeep', 'Barovia'] },
  });
}

function slugsOf(state: PagesState): string[] {
  return state.maps.map((map) => map.slug);
}

const FIRST = loaded(initialPages, firstPage(null), ['a', 'b']);

describe('nextPage', () => {
  it('asks for 21 maps first, then 24 at a time after the loaded ones', () => {
    expect(nextPage(initialPages)).toEqual({
      tag: null,
      offset: 0,
      limit: 21,
    });
    expect(nextPage({ ...FIRST, tag: 'Waterdeep' })).toEqual({
      tag: 'Waterdeep',
      offset: 2,
      limit: 24,
    });
  });
});

describe('pagesReducer', () => {
  it('keeps the first page with its total and every collection', () => {
    expect(slugsOf(FIRST)).toEqual(['a', 'b']);
    expect(FIRST.total).toBe(5);
    expect(FIRST.tags).toEqual(['Waterdeep', 'Barovia']);
    expect(FIRST.status).toBe('ready');
  });

  it('adds the next page after the loaded maps, without repeats', () => {
    const asked = pagesReducer(FIRST, { type: 'moreRequested' });
    const more = loaded(asked, nextPage(FIRST), ['b', 'c', 'd']);

    expect(asked.status).toBe('loadingMore');
    expect(slugsOf(more)).toEqual(['a', 'b', 'c', 'd']);
    expect(more.status).toBe('ready');
  });

  it('ignores a page that answers an older request', () => {
    const otherTag = loaded(FIRST, firstPage('Waterdeep'), ['x']);
    const otherOffset = loaded(FIRST, { tag: null, offset: 0, limit: 24 }, [
      'x',
    ]);

    expect(otherTag).toBe(FIRST);
    expect(otherOffset).toBe(FIRST);
  });

  it('starts again from nothing when another collection is chosen', () => {
    const chosen = pagesReducer(FIRST, { type: 'tagChosen', tag: 'Barovia' });

    expect(chosen).toMatchObject({
      tag: 'Barovia',
      maps: [],
      total: 0,
      status: 'loading',
      tags: ['Waterdeep', 'Barovia'],
    });
    expect(pagesReducer(FIRST, { type: 'tagChosen', tag: null })).toBe(FIRST);
  });

  it('tells a failed first page from a failed next page', () => {
    const first = pagesReducer(initialPages, {
      type: 'pageFailed',
      request: firstPage(null),
    });
    const next = pagesReducer(pagesReducer(FIRST, { type: 'moreRequested' }), {
      type: 'pageFailed',
      request: nextPage(FIRST),
    });

    expect(first.status).toBe('error');
    expect(next.status).toBe('moreFailed');
    expect(slugsOf(next)).toEqual(['a', 'b']);
  });

  it('asks for more only once at a time and only while maps are left', () => {
    const asked = pagesReducer(FIRST, { type: 'moreRequested' });
    const all = loaded(initialPages, firstPage(null), ['a', 'b'], 2);

    expect(pagesReducer(asked, { type: 'moreRequested' })).toBe(asked);
    expect(pagesReducer(all, { type: 'moreRequested' })).toBe(all);
  });
});

describe('hasMore, canLoadMore and isComplete', () => {
  it('know whether maps are left to load', () => {
    const asked = pagesReducer(FIRST, { type: 'moreRequested' });
    const all = loaded(initialPages, firstPage(null), ['a', 'b'], 2);

    expect(hasMore(initialPages)).toBe(false);
    expect(hasMore(FIRST)).toBe(true);
    expect(canLoadMore(FIRST)).toBe(true);
    expect(hasMore(asked)).toBe(true);
    expect(canLoadMore(asked)).toBe(false);
    expect(hasMore(all)).toBe(false);

    expect(isComplete(initialPages)).toBe(false);
    expect(isComplete(FIRST)).toBe(false);
    expect(isComplete(all)).toBe(true);
  });

  it('lets a failed next page be tried again', () => {
    const failed = pagesReducer(
      pagesReducer(FIRST, { type: 'moreRequested' }),
      { type: 'pageFailed', request: nextPage(FIRST) },
    );

    expect(canLoadMore(failed)).toBe(true);
  });
});
