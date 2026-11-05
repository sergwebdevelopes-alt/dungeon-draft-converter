interface FormatPreset {
  name: string;
  ppi: number;
  format: 'jpg' | 'webp';
}

type Variant = 'NoGrid' | 'Grid';

interface LogoLimit {
  min: number;
  max: number;
  step: number;
  default: number;
}

interface LogoLimits {
  size: LogoLimit;
  margin: LogoLimit;
}

type LogoSetting = keyof LogoLimits;

interface ConfigResponse {
  presets: readonly FormatPreset[];
  variants: readonly Variant[];
  maxUploadBytes: number;
  maxTotalUploadBytes: number;
  maxLevels: number;
  maxLogoBytes: number;
  logo: LogoLimits;
}

type QueuePosition =
  | { state: 'waiting'; ahead: number }
  | { state: 'converting' }
  | { state: 'unknown' };

export type {
  ConfigResponse,
  FormatPreset,
  LogoLimit,
  LogoLimits,
  LogoSetting,
  QueuePosition,
  Variant,
};
