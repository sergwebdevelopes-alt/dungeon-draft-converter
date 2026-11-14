import { createContext, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router';
import type { MapEntry } from '../model/catalog.ts';
import {
  mapWindowState,
  openedMapWindow,
  type MapWindowState,
  type OpenedMapWindow,
} from '../model/map-window.ts';

const OpenMapSlug = createContext<string | null>(null);

function useOpenedMapWindow(): OpenedMapWindow | null {
  return openedMapWindow(useLocation());
}

function useOpenMap() {
  const navigate = useNavigate();
  const location = useLocation();
  const slug = useContext(OpenMapSlug);

  function windowState(map: MapEntry, morph = false): MapWindowState {
    return mapWindowState(location, map, morph);
  }

  function open(map: MapEntry) {
    void navigate(map.path, { state: windowState(map, true) });
  }

  function close() {
    void navigate(-1);
  }

  return { slug, open, close, windowState };
}

export { OpenMapSlug, useOpenMap, useOpenedMapWindow };
