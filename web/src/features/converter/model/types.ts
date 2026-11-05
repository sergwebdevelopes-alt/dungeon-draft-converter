import type {
  FormatPreset,
  LOGO_LIMITS,
  LogoSetting,
  Variant,
} from '../../../../../src/features/converter/image-processing/render-map-images.ts';
import type { QueuePosition } from '../../../../../src/features/converter/application/conversion-queue.ts';

type LogoLimits = typeof LOGO_LIMITS;

type LogoPlacement = Record<LogoSetting, number>;

interface Config {
  presets: FormatPreset[];
  variants: Variant[];
  maxUploadBytes: number;
  maxTotalUploadBytes: number;
  maxLevels: number;
  maxLogoBytes: number;
  logo: LogoLimits;
}

interface ConvertRequest {
  ticket: string;
  maps: File[];
  presets: string[];
  variants: Variant[];
  logo?: { image: File; placement: LogoPlacement };
}

export type {
  Config,
  ConvertRequest,
  FormatPreset,
  LogoLimits,
  LogoPlacement,
  QueuePosition,
  Variant,
};
