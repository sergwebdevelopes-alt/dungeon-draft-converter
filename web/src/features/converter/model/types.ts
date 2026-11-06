import type {
  ConfigResponse,
  FormatPreset,
  LogoLimits,
  LogoSetting,
  QueuePosition,
  Variant,
} from '../../../../../src/contracts/converter-api.ts';

type LogoPlacement = Record<LogoSetting, number>;

type Config = ConfigResponse;

interface ConvertRequest {
  ticket: string;
  maps: File[];
  presets: string[];
  variants: Variant[];
  foundry: boolean;
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
