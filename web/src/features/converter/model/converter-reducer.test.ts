import { describe, expect, it } from 'vitest';
import {
  canSubmit,
  converterReducer,
  initialState,
  presetsToConvert,
  selectedPresets,
  tooLargePresets,
  visibleMaps,
  type ConverterAction,
  type ConverterState,
} from './converter-reducer.ts';
import { TEST_CONFIG, file } from './test-config.ts';

const SETTINGS = {
  presets: ['JPG_70', 'WEBP_140'],
  variants: ['NoGrid', 'Grid'] as const,
  placement: { size: 10, margin: 3 },
};

function run(...actions: ConverterAction[]): ConverterState {
  return actions.reduce(converterReducer, initialState);
}

const loaded: ConverterAction = {
  type: 'configLoaded',
  config: TEST_CONFIG,
  settings: { ...SETTINGS, variants: [...SETTINGS.variants] },
};
const withMap: ConverterAction = {
  type: 'mapsAdded',
  files: [file('Cave.dd2vtt')],
};
const submitted: ConverterAction = {
  type: 'submitted',
  ticket: 't',
  startedAt: 5,
};
const done: ConverterAction = {
  type: 'succeeded',
  url: 'blob:z',
  fileName: 'Cave.zip',
};

describe('converterReducer', () => {
  it('loads the config with the saved settings', () => {
    const state = run(loaded);

    expect(state.config).toBe(TEST_CONFIG);
    expect(state.presets).toEqual(['JPG_70', 'WEBP_140']);
    expect(state.placement).toEqual({ size: 10, margin: 3 });
  });

  it('shows a message when the config cannot load', () => {
    expect(run({ type: 'configFailed' }).configError).toBe(
      'Could not load settings. Reload the page to retry.',
    );
  });

  it('ignores maps until the config has loaded', () => {
    expect(run(withMap).maps).toEqual([]);
  });

  it('adds maps or shows why not', () => {
    expect(run(loaded, withMap).maps).toHaveLength(1);

    const state = run(loaded, { type: 'mapsAdded', files: [file('a.txt')] });
    expect(state.status).toEqual({
      kind: 'error',
      message: '"a.txt" is not a .dd2vtt file.',
    });
  });

  it('moves and removes maps', () => {
    const two: ConverterAction = {
      type: 'mapsAdded',
      files: [file('A.dd2vtt'), file('B.dd2vtt')],
    };

    expect(run(loaded, two).maps.map((m) => m.name)).toEqual([
      'B.dd2vtt',
      'A.dd2vtt',
    ]);
    expect(
      run(loaded, two, { type: 'mapMoved', from: 1, to: 0 }).maps.map(
        (m) => m.name,
      ),
    ).toEqual(['A.dd2vtt', 'B.dd2vtt']);
    expect(
      run(loaded, two, { type: 'mapRemoved', index: 0 }).maps.map(
        (m) => m.name,
      ),
    ).toEqual(['A.dd2vtt']);
  });

  it('hides and shows a level', () => {
    const two: ConverterAction = {
      type: 'mapsAdded',
      files: [file('A.dd2vtt'), file('B.dd2vtt')],
    };
    const hidden = run(loaded, two, { type: 'levelToggled', index: 0 });

    expect(visibleMaps(hidden).map((m) => m.name)).toEqual(['A.dd2vtt']);
    expect(hidden.maps).toHaveLength(2);
    expect(
      visibleMaps(converterReducer(hidden, { type: 'levelToggled', index: 0 })),
    ).toHaveLength(2);
  });

  it('keeps a level hidden when it moves, and forgets it when removed', () => {
    const two: ConverterAction = {
      type: 'mapsAdded',
      files: [file('A.dd2vtt'), file('B.dd2vtt')],
    };
    const hidden = run(loaded, two, { type: 'levelToggled', index: 0 });

    const moved = converterReducer(hidden, {
      type: 'mapMoved',
      from: 0,
      to: 1,
    });
    expect(visibleMaps(moved).map((m) => m.name)).toEqual(['A.dd2vtt']);

    const removed = converterReducer(hidden, { type: 'mapRemoved', index: 0 });
    expect(removed.hidden).toEqual([]);
    expect(converterReducer(hidden, { type: 'reset' }).hidden).toEqual([]);
  });

  it('toggles formats and sets grid options', () => {
    const state = run(
      loaded,
      { type: 'presetToggled', name: 'JPG_70' },
      { type: 'variantsChosen', variants: ['NoGrid'] },
    );

    expect(state.presets).toEqual(['WEBP_140']);
    expect(state.variants).toEqual(['NoGrid']);
    expect(
      run(
        loaded,
        { type: 'presetToggled', name: 'JPG_70' },
        { type: 'presetToggled', name: 'JPG_70' },
      ).presets,
    ).toEqual(['WEBP_140', 'JPG_70']);
  });

  it('sets the grid variants in one step', () => {
    const state = run(loaded, withMap, submitted, done, {
      type: 'variantsChosen',
      variants: ['Grid'],
    });

    expect(state.variants).toEqual(['Grid']);
    expect(state.status).toEqual({ kind: 'idle' });
  });

  it('checks the logo before using it', () => {
    const png = file('logo.png', 10, 'image/png');

    expect(run(loaded, { type: 'logoSelected', file: png }).logo).toBe(png);
    expect(
      run(loaded, {
        type: 'logoSelected',
        file: file('l.gif', 10, 'image/gif'),
      }).status.kind,
    ).toBe('error');
    expect(
      run(loaded, { type: 'logoSelected', file: png }, { type: 'logoCleared' })
        .logo,
    ).toBeNull();
  });

  it('changes and resets the logo placement', () => {
    const moved = run(loaded, {
      type: 'placementChanged',
      placement: { size: 15, margin: 1 },
    });
    expect(moved.placement).toEqual({ size: 15, margin: 1 });

    expect(
      converterReducer(moved, { type: 'placementReset' }).placement,
    ).toEqual({ size: 10, margin: 3 });
  });

  it('goes from converting to done', () => {
    const converting = run(loaded, withMap, submitted);
    expect(converting.status).toMatchObject({
      kind: 'converting',
      ticket: 't',
      progress: { state: 'uploading' },
    });

    const waiting = converterReducer(converting, {
      type: 'progressed',
      ticket: 't',
      progress: { state: 'waiting', ahead: 2 },
    });
    expect(waiting.status).toMatchObject({
      progress: { state: 'waiting', ahead: 2 },
    });

    expect(converterReducer(waiting, done).status).toEqual({
      kind: 'done',
      url: 'blob:z',
      fileName: 'Cave.zip',
    });
  });

  it('ignores progress for another ticket', () => {
    const converting = run(loaded, withMap, submitted);

    expect(
      converterReducer(converting, {
        type: 'progressed',
        ticket: 'old',
        progress: { state: 'converting' },
      }).status,
    ).toBe(converting.status);
  });

  it('fails or cancels a conversion', () => {
    expect(
      run(loaded, withMap, submitted, { type: 'failed', message: 'Broken.' })
        .status,
    ).toEqual({ kind: 'error', message: 'Broken.' });
    expect(
      run(loaded, withMap, submitted, { type: 'cancelled' }).status,
    ).toEqual({ kind: 'idle' });
  });

  it('clears a finished result when the user edits the form', () => {
    const state = run(loaded, withMap, submitted, done, {
      type: 'presetToggled',
      name: 'JPG_70',
    });

    expect(state.status).toEqual({ kind: 'idle' });
  });

  it('starts over without the maps but keeps the options', () => {
    const state = run(loaded, withMap, submitted, done, { type: 'reset' });

    expect(state.maps).toEqual([]);
    expect(state.status).toEqual({ kind: 'idle' });
    expect(state.presets).toEqual(['JPG_70', 'WEBP_140']);
  });
});

describe('canSubmit', () => {
  it('needs a map, a format and a grid option, and no conversion running', () => {
    expect(canSubmit(run(loaded))).toBe(false);
    expect(canSubmit(run(loaded, withMap))).toBe(true);
    expect(
      canSubmit(
        run(
          loaded,
          withMap,
          { type: 'presetToggled', name: 'JPG_70' },
          { type: 'presetToggled', name: 'WEBP_140' },
        ),
      ),
    ).toBe(false);
    expect(
      canSubmit(run(loaded, withMap, { type: 'variantsChosen', variants: [] })),
    ).toBe(false);
    expect(canSubmit(run(loaded, withMap, submitted))).toBe(false);
    expect(
      canSubmit(run(loaded, withMap, { type: 'levelToggled', index: 0 })),
    ).toBe(false);
  });
});

describe('selectedPresets', () => {
  it('keeps the config order', () => {
    const state = run(
      loaded,
      { type: 'presetToggled', name: 'JPG_70' },
      { type: 'presetToggled', name: 'JPG_70' },
    );

    expect(selectedPresets(state).map((p) => p.name)).toEqual([
      'JPG_70',
      'WEBP_140',
    ]);
  });
});

describe('formats too large for the map', () => {
  const smallLimit: ConverterAction = {
    type: 'configLoaded',
    config: { ...TEST_CONFIG, maxOutputPixels: 1_000_000 },
    settings: { ...SETTINGS, variants: [...SETTINGS.variants] },
  };
  const bigMap: ConverterAction = {
    type: 'mapSizeKnown',
    size: { columns: 20, rows: 25 },
  };

  it('leaves out the JPG format that would pass the limit, keeping the choice', () => {
    const state = run(smallLimit, withMap, bigMap);

    expect(tooLargePresets(state)).toEqual(['JPG_70']);
    expect(presetsToConvert(state)).toEqual(['WEBP_140']);
    expect(selectedPresets(state).map((preset) => preset.name)).toEqual([
      'WEBP_140',
    ]);
    expect(state.presets).toEqual(['JPG_70', 'WEBP_140']);
  });

  it('limits nothing once the map size is unknown again', () => {
    const state = run(smallLimit, withMap, bigMap, {
      type: 'mapSizeKnown',
      size: null,
    });

    expect(tooLargePresets(state)).toEqual([]);
    expect(presetsToConvert(state)).toEqual(['JPG_70', 'WEBP_140']);
  });

  it('cannot convert when every chosen format is too large', () => {
    const state = run(
      smallLimit,
      withMap,
      { type: 'presetToggled', name: 'WEBP_140' },
      bigMap,
    );

    expect(state.presets).toEqual(['JPG_70']);
    expect(canSubmit(state)).toBe(false);
  });
});
