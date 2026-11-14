import type { MapEntry } from './catalog.ts';

interface PageLocation {
  pathname: string;
  search: string;
  hash: string;
  state: unknown;
  key: string;
}

interface MapWindowState {
  visit: string;
  background: PageLocation;
  map: MapEntry;
  morph: boolean;
}

interface OpenedMapWindow {
  background: PageLocation;
  map: MapEntry;
  morph: boolean;
}

const THIS_VISIT = `${Date.now()}-${Math.random()}`;

function mapWindowState(
  background: PageLocation,
  map: MapEntry,
  morph: boolean,
): MapWindowState {
  return { visit: THIS_VISIT, background, map, morph };
}

function openedMapWindow(location: PageLocation): OpenedMapWindow | null {
  const state = location.state as Partial<MapWindowState> | null;
  if (state?.visit !== THIS_VISIT || !state.background || !state.map) {
    return null;
  }

  return {
    background: state.background,
    map: state.map,
    morph: state.morph === true,
  };
}

export { mapWindowState, openedMapWindow };
export type { MapWindowState, OpenedMapWindow, PageLocation };
