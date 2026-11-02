import { describe, expect, it } from 'vitest';
import { toConvertRequest } from './convert-request.ts';
import { initialState } from './converter-reducer.ts';
import { levelKey } from './map-rules.ts';
import { TEST_CONFIG, file } from './test-config.ts';

describe('toConvertRequest', () => {
  const maps = [file('Cave.dd2vtt')];
  const base = {
    ...initialState,
    config: TEST_CONFIG,
    maps,
    presets: ['JPG_70'],
    variants: ['Grid' as const],
    placement: { size: 99, margin: 1 },
  };

  it('sends the logo with a clamped placement', () => {
    const logo = file('logo.png', 5, 'image/png');

    expect(toConvertRequest({ ...base, logo }, 't')).toEqual({
      ticket: 't',
      maps,
      presets: ['JPG_70'],
      variants: ['Grid'],
      logo: { image: logo, placement: { size: 20, margin: 1 } },
    });
  });

  it('sends only the levels that are shown', () => {
    const attic = file('Attic.dd2vtt');
    const state = {
      ...base,
      maps: [attic, ...maps],
      hidden: [levelKey(attic)],
    };

    expect(toConvertRequest(state, 't').maps).toEqual(maps);
  });

  it('leaves the logo out when there is none', () => {
    expect(toConvertRequest(base, 't').logo).toBeUndefined();
  });
});
