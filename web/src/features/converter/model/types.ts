import type {
  FormatPreset,
  LOGO_LIMITS,
  LogoSetting,
  Variant,
} from '../../../../../src/core/images.ts';
import type { QueuePosition } from '../../../../../src/queue/index.ts';

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
