import {
  tooLargePresets as presetsTooLarge,
  type MapSize,
} from './format-limits.ts';
import { addMaps, levelKey, logoError, moveItem } from './map-rules.ts';
import { defaultPlacement } from './placement.ts';
import { withProgress, type Progress, type Status } from './progress.ts';
import type { Settings } from './settings.ts';
import type { Config, LogoPlacement, Variant } from './types.ts';

interface ConverterState {
  config: Config | null;
  configError: string | null;
  maps: File[];
  hidden: string[];
  logo: File | null;
  placement: LogoPlacement | null;
  presets: string[];
  variants: Variant[];
  foundry: boolean;
  mapSize: MapSize | null;
  status: Status;
}

type ConverterAction =
  | { type: 'configLoaded'; config: Config; settings: Settings }
  | { type: 'configFailed' }
  | { type: 'mapsAdded'; files: File[] }
  | { type: 'mapMoved'; from: number; to: number }
  | { type: 'mapRemoved'; index: number }
  | { type: 'levelToggled'; index: number }
  | { type: 'logoSelected'; file: File }
  | { type: 'logoCleared' }
  | { type: 'presetToggled'; name: string }
  | { type: 'foundryToggled' }
  | { type: 'variantsChosen'; variants: Variant[] }
  | { type: 'mapSizeKnown'; size: MapSize | null }
  | { type: 'placementChanged'; placement: LogoPlacement }
  | { type: 'placementReset' }
  | { type: 'submitted'; ticket: string; startedAt: number }
  | { type: 'progressed'; ticket: string; progress: Progress }
  | { type: 'succeeded'; url: string; fileName: string }
  | { type: 'failed'; message: string }
  | { type: 'cancelled' }
  | { type: 'reset' };

const initialState: ConverterState = {
  config: null,
  configError: null,
  maps: [],
  hidden: [],
  logo: null,
  placement: null,
  presets: [],
  variants: [],
  foundry: false,
  mapSize: null,
  status: { kind: 'idle' },
};

const CONFIG_ERROR = 'Could not load settings. Reload the page to retry.';

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

function clearResult(status: Status): Status {
  return status.kind === 'done' || status.kind === 'error'
    ? { kind: 'idle' }
    : status;
}

function edited(
  state: ConverterState,
  changes: Partial<ConverterState>,
): ConverterState {
  return { ...state, ...changes, status: clearResult(state.status) };
}

function failed(state: ConverterState, message: string): ConverterState {
  return { ...state, status: { kind: 'error', message } };
}

function withoutMap(state: ConverterState, index: number): ConverterState {
  const maps = state.maps.filter((_, i) => i !== index);
  const kept = new Set(maps.map(levelKey));

  return edited(state, {
    maps,
    hidden: state.hidden.filter((key) => kept.has(key)),
  });
}

function toggleLevel(state: ConverterState, index: number): ConverterState {
  const map = state.maps.at(index);

  return map
    ? edited(state, { hidden: toggle(state.hidden, levelKey(map)) })
    : state;
}

function selectLogo(state: ConverterState, file: File): ConverterState {
  const error = logoError(file, state.config?.maxLogoBytes ?? Infinity);

  return error ? failed(state, error) : edited(state, { logo: file });
}

function converterReducer(
  state: ConverterState,
  action: ConverterAction,
): ConverterState {
  switch (action.type) {
    case 'configLoaded':
      return { ...state, config: action.config, ...action.settings };

    case 'configFailed':
      return { ...state, configError: CONFIG_ERROR };

    case 'mapsAdded': {
      if (!state.config) {
        return state;
      }
      const { maps, error } = addMaps(state.maps, action.files, state.config);
      return {
        ...state,
        maps,
        status: error ? { kind: 'error', message: error } : { kind: 'idle' },
      };
    }

    case 'mapMoved':
      return edited(state, {
        maps: moveItem(state.maps, action.from, action.to),
      });

    case 'mapRemoved':
      return withoutMap(state, action.index);

    case 'levelToggled':
      return toggleLevel(state, action.index);

    case 'logoSelected':
      return selectLogo(state, action.file);

    case 'logoCleared':
      return edited(state, { logo: null });

    case 'presetToggled':
      return edited(state, { presets: toggle(state.presets, action.name) });

    case 'foundryToggled':
      return edited(state, { foundry: !state.foundry });

    case 'variantsChosen':
      return edited(state, { variants: action.variants });

    case 'mapSizeKnown':
      return { ...state, mapSize: action.size };

    case 'placementChanged':
      return edited(state, { placement: action.placement });

    case 'placementReset':
      return state.config
        ? edited(state, { placement: defaultPlacement(state.config.logo) })
        : state;

    case 'submitted':
      return {
        ...state,
        status: {
          kind: 'converting',
          startedAt: action.startedAt,
          ticket: action.ticket,
          progress: { state: 'uploading' },
        },
      };

    case 'progressed':
      return {
        ...state,
        status: withProgress(state.status, action.ticket, action.progress),
      };

    case 'succeeded':
      return {
        ...state,
        status: { kind: 'done', url: action.url, fileName: action.fileName },
      };

    case 'failed':
      return failed(state, action.message);

    case 'cancelled':
      return { ...state, status: { kind: 'idle' } };

    case 'reset':
      return { ...state, maps: [], hidden: [], status: { kind: 'idle' } };
  }
}

function isConverting(state: ConverterState): boolean {
  return state.status.kind === 'converting';
}

function isHidden(state: ConverterState, map: File): boolean {
  return state.hidden.includes(levelKey(map));
}

function visibleMaps(state: ConverterState): File[] {
  return state.maps.filter((map) => !isHidden(state, map));
}

function tooLargePresets(state: ConverterState): string[] {
  return state.config
    ? presetsTooLarge(
        state.config.presets,
        state.mapSize,
        state.config.maxOutputPixels,
      )
    : [];
}

function presetsToConvert(state: ConverterState): string[] {
  const tooLarge = tooLargePresets(state);

  return state.presets.filter((name) => !tooLarge.includes(name));
}

function canSubmit(state: ConverterState): boolean {
  return (
    !!state.config &&
    visibleMaps(state).length > 0 &&
    presetsToConvert(state).length > 0 &&
    state.variants.length > 0 &&
    !isConverting(state)
  );
}

function selectedPresets(state: ConverterState) {
  const names = presetsToConvert(state);

  return (
    state.config?.presets.filter((preset) => names.includes(preset.name)) ?? []
  );
}

export {
  canSubmit,
  converterReducer,
  initialState,
  isConverting,
  isHidden,
  presetsToConvert,
  selectedPresets,
  tooLargePresets,
  visibleMaps,
};
export type { ConverterAction, ConverterState };
