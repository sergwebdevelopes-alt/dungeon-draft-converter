import { clampPlacement } from './placement.ts';
import {
  presetsToConvert,
  visibleMaps,
  type ConverterState,
} from './converter-reducer.ts';
import type { ConvertRequest } from './types.ts';

function toConvertRequest(
  state: ConverterState,
  ticket: string,
): ConvertRequest {
  const { config, logo, placement, variants, foundry } = state;
  const logoOptions =
    logo && placement && config
      ? { image: logo, placement: clampPlacement(placement, config.logo) }
      : undefined;

  return {
    ticket,
    maps: visibleMaps(state),
    logo: logoOptions,
    presets: presetsToConvert(state),
    variants,
    foundry,
  };
}

export { toConvertRequest };
