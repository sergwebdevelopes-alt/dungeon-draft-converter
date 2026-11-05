import type {
  MapEntry,
  MapsResponse,
} from '../../../../../src/contracts/gallery-api.ts';

const FIRST_PAGE_SIZE = 21;
const PAGE_SIZE = 24;

type PagesStatus = 'loading' | 'ready' | 'loadingMore' | 'error' | 'moreFailed';

interface PagesState {
  tag: string | null;
  maps: MapEntry[];
  total: number;
  tags: string[];
  status: PagesStatus;
}

interface PageRequest {
  tag: string | null;
  offset: number;
  limit: number;
}

type PagesAction =
  | { type: 'tagChosen'; tag: string | null }
  | { type: 'moreRequested' }
  | { type: 'pageLoaded'; request: PageRequest; page: MapsResponse }
  | { type: 'pageFailed'; request: PageRequest };

const initialPages: PagesState = {
  tag: null,
  maps: [],
  total: 0,
  tags: [],
  status: 'loading',
};

function firstPage(tag: string | null): PageRequest {
  return { tag, offset: 0, limit: FIRST_PAGE_SIZE };
}

function nextPage({ tag, maps }: PagesState): PageRequest {
  return maps.length === 0
    ? firstPage(tag)
    : { tag, offset: maps.length, limit: PAGE_SIZE };
}

function hasMore({ maps, total, status }: PagesState): boolean {
  return status !== 'loading' && status !== 'error' && maps.length < total;
}

function canLoadMore(state: PagesState): boolean {
  return hasMore(state) && state.status !== 'loadingMore';
}

function isComplete(state: PagesState): boolean {
  return state.status !== 'loading' && state.maps.length >= state.total;
}

function answers(state: PagesState, request: PageRequest): boolean {
  return request.tag === state.tag && request.offset === state.maps.length;
}

function withPage(maps: MapEntry[], page: MapEntry[]): MapEntry[] {
  const known = new Set(maps.map((map) => map.slug));

  return [...maps, ...page.filter((map) => !known.has(map.slug))];
}

function pagesReducer(state: PagesState, action: PagesAction): PagesState {
  switch (action.type) {
    case 'tagChosen':
      return action.tag === state.tag
        ? state
        : { ...state, tag: action.tag, maps: [], total: 0, status: 'loading' };

    case 'moreRequested':
      return canLoadMore(state) ? { ...state, status: 'loadingMore' } : state;

    case 'pageLoaded':
      if (!answers(state, action.request)) {
        return state;
      }

      return {
        ...state,
        maps: withPage(state.maps, action.page.maps),
        total: action.page.total,
        tags: action.page.tags,
        status: 'ready',
      };

    case 'pageFailed':
      if (!answers(state, action.request)) {
        return state;
      }

      return {
        ...state,
        status: state.maps.length === 0 ? 'error' : 'moreFailed',
      };
  }
}

export {
  FIRST_PAGE_SIZE,
  PAGE_SIZE,
  canLoadMore,
  firstPage,
  hasMore,
  initialPages,
  isComplete,
  nextPage,
  pagesReducer,
};
export type { PageRequest, PagesAction, PagesState, PagesStatus };
