import { addMaps, logoError, moveItem } from './map-rules.ts';
import { defaultPlacement } from './placement.ts';
import { withProgress, type Progress, type Status } from './progress.ts';
import type { Settings } from './settings.ts';
import type { Config, LogoPlacement, Variant } from './types.ts';

interface ConverterState {
  config: Config | null;
  configError: string | null;
  maps: File[];
  logo: File | null;
  placement: LogoPlacement | null;
  presets: string[];
  variants: Variant[];
  status: Status;
}

type ConverterAction =
  | { type: 'configLoaded'; config: Config; settings: Settings }
  | { type: 'configFailed' }
  | { type: 'mapsAdded'; files: File[] }
  | { type: 'mapMoved'; from: number; to: number }
  | { type: 'mapRemoved'; index: number }
  | { type: 'logoSelected'; file: File }
  | { type: 'logoCleared' }
  | { type: 'presetToggled'; name: string }
  | { type: 'variantToggled'; variant: Variant }
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
  logo: null,
  placement: null,
  presets: [],
  variants: [],
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
      return edited(state, {
        maps: state.maps.filter((_, i) => i !== action.index),
      });

    case 'logoSelected':
      return selectLogo(state, action.file);

    case 'logoCleared':
      return edited(state, { logo: null });

    case 'presetToggled':
      return edited(state, { presets: toggle(state.presets, action.name) });

    case 'variantToggled':
      return edited(state, {
        variants: toggle(state.variants, action.variant),
      });

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
      return { ...state, maps: [], status: { kind: 'idle' } };
  }
}

function isConverting(state: ConverterState): boolean {
  return state.status.kind === 'converting';
}

function canSubmit(state: ConverterState): boolean {
  return (
    !!state.config &&
    state.maps.length > 0 &&
    state.presets.length > 0 &&
    state.variants.length > 0 &&
    !isConverting(state)
  );
}

function selectedPresets(state: ConverterState) {
  return (
    state.config?.presets.filter((preset) =>
      state.presets.includes(preset.name),
    ) ?? []
  );
}

export {
  canSubmit,
  converterReducer,
  initialState,
  isConverting,
  selectedPresets,
};
export type { ConverterAction, ConverterState };
