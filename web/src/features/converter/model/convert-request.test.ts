import { describe, expect, it } from 'vitest';
import { toConvertRequest } from './convert-request.ts';
import { initialState } from './converter-reducer.ts';
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

  it('leaves the logo out when there is none', () => {
    expect(toConvertRequest(base, 't').logo).toBeUndefined();
  });
});
