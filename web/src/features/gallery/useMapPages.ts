import { useEffect, useReducer, useRef } from 'react';
import { isAbortError } from '../../shared/http/index.ts';
import { galleryApi, type GalleryApi } from './api.ts';
import {
  canLoadMore,
  firstPage,
  initialPages,
  nextPage,
  pagesReducer,
  type PageRequest,
  type PagesAction,
} from './model/map-pages.ts';

async function load(
  api: GalleryApi,
  request: PageRequest,
  signal: AbortSignal,
  dispatch: (action: PagesAction) => void,
): Promise<void> {
  try {
    const page = await api.fetchPage(request, signal);
    dispatch({ type: 'pageLoaded', request, page });
  } catch (error) {
    if (!isAbortError(error)) {
      dispatch({ type: 'pageFailed', request });
    }
  }
}

function useMapPages(api: GalleryApi = galleryApi) {
  const [state, dispatch] = useReducer(pagesReducer, initialPages);
  const more = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void load(api, firstPage(state.tag), controller.signal, dispatch);

    return () => {
      controller.abort();
      more.current?.abort();
    };
  }, [api, state.tag]);

  function chooseTag(tag: string | null) {
    dispatch({ type: 'tagChosen', tag });
  }

  function loadMore() {
    if (!canLoadMore(state)) {
      return;
    }

    more.current = new AbortController();
    dispatch({ type: 'moreRequested' });
    void load(api, nextPage(state), more.current.signal, dispatch);
  }

  return { state, chooseTag, loadMore };
}

export { useMapPages };
